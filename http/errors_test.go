package http_test

import (
	"context"
	"encoding/json"
	stderrors "errors"
	"fmt"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/influxdata/influxdb/v2"
	"github.com/influxdata/influxdb/v2/http"
	kithttp "github.com/influxdata/influxdb/v2/kit/transport/http"
	"github.com/stretchr/testify/require"
)

func TestCheckError(t *testing.T) {
	for _, tt := range []struct {
		name  string
		write func(w *httptest.ResponseRecorder)
		want  *influxdb.Error
	}{
		{
			name: "platform error",
			write: func(w *httptest.ResponseRecorder) {
				h := kithttp.ErrorHandler(0)
				err := &influxdb.Error{
					Msg:  "expected",
					Code: influxdb.EInvalid,
				}
				h.HandleHTTPError(context.Background(), err, w)
			},
			want: &influxdb.Error{
				Msg:  "expected",
				Code: influxdb.EInvalid,
			},
		},
		{
			name: "text error",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Content-Type", "text/plain")
				w.WriteHeader(500)
				_, _ = io.WriteString(w, "upstream timeout\n")
			},
			want: &influxdb.Error{
				Code: influxdb.EInternal,
				Err:  stderrors.New("upstream timeout"),
			},
		},
		{
			name: "error with bad json",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(500)
				_, _ = io.WriteString(w, "upstream timeout\n")
			},
			want: &influxdb.Error{
				Code: influxdb.EInternal,
				Msg:  `attempted to unmarshal error as JSON but failed: "invalid character 'u' looking for beginning of value"`,
				Err:  stderrors.New("upstream timeout"),
			},
		},
		{
			name: "error with no content-type (encoded as json - with code)",
			write: func(w *httptest.ResponseRecorder) {
				w.WriteHeader(500)
				_, _ = io.WriteString(w, `{"error": "service unavailable", "code": "unavailable"}`)
			},
			want: &influxdb.Error{
				Code: influxdb.EUnavailable,
				Err:  stderrors.New("service unavailable"),
			},
		},
		{
			name: "error with no content-type (encoded as json - no code)",
			write: func(w *httptest.ResponseRecorder) {
				w.WriteHeader(503)
				_, _ = io.WriteString(w, `{"error": "service unavailable"}`)
			},
			want: &influxdb.Error{
				Code: influxdb.EUnavailable,
				Err:  stderrors.New("service unavailable"),
			},
		},
		{
			name: "error with no content-type (not json encoded)",
			write: func(w *httptest.ResponseRecorder) {
				w.WriteHeader(503)
			},
			want: &influxdb.Error{
				Code: influxdb.EUnavailable,
				Msg:  `attempted to unmarshal error as JSON but failed: "unexpected end of JSON input"`,
				Err:  stderrors.New(""),
			},
		},
		{
			name: "429 Retry-After with text response",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Content-Type", "text/plain")
				w.Header().Set("Retry-After", "1")
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `Write Limit Exceeded`)
			},
			want: &influxdb.Error{
				Code: influxdb.ETooManyRequests,
				Err:  http.NewRetriableError(stderrors.New("Write Limit Exceeded"), 1*time.Second),
			},
		},
		{
			name: "429 Retry-After with JSON response",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Retry-After", "2")
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `{"error": "Write Limit Exceeded"}`)
			},
			want: &influxdb.Error{
				Code: influxdb.ETooManyRequests,
				Err:  http.NewRetriableError(stderrors.New("Write Limit Exceeded"), 2*time.Second),
			},
		},
		{
			name: "429 Retry-After unsupported value",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Retry-After", "ee")
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `{"error": "Write Limit Exceeded"}`)
			},
			want: &influxdb.Error{
				Code: influxdb.ETooManyRequests,
				Err:  stderrors.New("Write Limit Exceeded"),
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			tt.write(w)

			resp := w.Result()
			cmpopt := cmp.Transformer("error", func(e error) string {
				if e, ok := e.(*influxdb.Error); ok {
					out, _ := json.Marshal(e)
					var retryError *http.RetriableError
					if stderrors.As(e, &retryError) {
						return fmt.Sprintf("%s; Retry-After: %v", string(out), retryError.RetryAfter())
					}
					return string(out)
				}
				return e.Error()
			})
			if got, want := http.CheckError(resp), tt.want; !cmp.Equal(want, got, cmpopt) {
				t.Fatalf("unexpected error -want/+got:\n%s", cmp.Diff(want, got, cmpopt))
			}
		})
	}
}

func TestRetryAfter(t *testing.T) {
	for _, tt := range []struct {
		name  string
		write func(w *httptest.ResponseRecorder)
		want  time.Duration
	}{
		{
			name: "429 Retry-After - server says don't retry",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Retry-After", "0")
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `{"error": "Write Limit Exceeded"}`)
			},
			want: 0,
		},
		{
			name: "429 Retry-After - retry after seconds",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Retry-After", "222")
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `{"error": "Write Limit Exceeded"}`)
			},
			want: 222 * time.Second,
		},
		{
			name: "429 Retry-After - unsupported retry",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Retry-After", "ee")
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `{"error": "Write Limit Exceeded"}`)
			},
			want: -1,
		},
		{
			name: "429 Retry-After - in the past",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Retry-After", "Sun, 06 Oct 2019 08:49:37 GMT")
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `{"error": "Write Limit Exceeded"}`)
			},
			want: 0,
		},
		{
			name: "429 Retry-After - unknown retry",
			write: func(w *httptest.ResponseRecorder) {
				w.WriteHeader(429)
				_, _ = io.WriteString(w, `{"error": "Write Limit Exceeded"}`)
			},
			want: -1,
		},
		{
			name: "200 Retry-After - unknown retry",
			write: func(w *httptest.ResponseRecorder) {
				w.Header().Set("Retry-After", "0")
				w.WriteHeader(200)
				_, _ = io.WriteString(w, ``)
			},
			want: -1,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			tt.write(w)

			resp := w.Result()
			err := http.CheckError(resp)
			if got, want := http.RetryAfter(err), tt.want; !cmp.Equal(want, got) {
				t.Fatalf("unexpected retryAfter -want/+got:\n%s", cmp.Diff(want, got))
			}
		})
	}
}

func TestNewRetryAfterError(t *testing.T) {
	require.Equal(t, "test", http.NewRetriableError(stderrors.New("test"), 0).Error())
	require.Equal(t, time.Duration(1), http.NewRetriableError(stderrors.New("test"), 1).RetryAfter())
	t.Run("nil wrapped error prints empty string", func(t *testing.T) {
		require.Equal(t, "", http.NewRetriableError(nil, 0).Error())
	})
}