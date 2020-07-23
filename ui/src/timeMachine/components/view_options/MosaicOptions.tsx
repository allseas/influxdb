// Libraries
import React, {SFC} from 'react'
import {connect, ConnectedProps} from 'react-redux'

// Components
import {Form, Input, Grid} from '@influxdata/clockface'
import AxisAffixes from 'src/timeMachine/components/view_options/AxisAffixes'
import TimeFormat from 'src/timeMachine/components/view_options/TimeFormat'

// Actions
import {
  setMosaicFillColumn,
  setYAxisLabel,
  setXAxisLabel,
  setAxisPrefix,
  setAxisSuffix,
  setColorHexes,
  setYDomain,
  setXColumn,
  setYColumn,
  setTimeFormat,
} from 'src/timeMachine/actions'

// Utils
import {
  getGroupableColumns,
  //getFillColumnsSelection,
  getMosaicFillColumnsSelection,
  getXColumnSelection,
  //getYColumnSelection,
  getMosaicYColumnSelection,
  getNumericColumns,
  getStringColumns,
  getActiveTimeMachine,
} from 'src/timeMachine/selectors'

// Constants
import {GIRAFFE_COLOR_SCHEMES} from 'src/shared/constants'

// Types
import {ComponentStatus} from '@influxdata/clockface'
import {AppState, NewView, MosaicViewProperties} from 'src/types'
import HexColorSchemeDropdown from 'src/shared/components/HexColorSchemeDropdown'
import AutoDomainInput from 'src/shared/components/AutoDomainInput'
import ColumnSelector from 'src/shared/components/ColumnSelector'

interface OwnProps {
  xColumn: string
  yColumn: string
  fillColumn: string
  xDomain: number[]
  yDomain: number[]
  xAxisLabel: string
  yAxisLabel: string
  xPrefix: string
  xSuffix: string
  yPrefix: string
  ySuffix: string
  colors: string[]
  showNoteWhenEmpty: boolean
}

type ReduxProps = ConnectedProps<typeof connector>
type Props = OwnProps & ReduxProps

const MosaicOptions: SFC<Props> = props => {
  const {
    fillColumn,
    // availableGroupColumns,
    yAxisLabel,
    xAxisLabel,
    onSetMosaicFillColumn,
    colors,
    onSetColors,
    onSetYAxisLabel,
    onSetXAxisLabel,
    yPrefix,
    ySuffix,
    onUpdateAxisSuffix,
    onUpdateAxisPrefix,
    yDomain,
    onSetYDomain,
    xColumn,
    yColumn,
    stringColumns,
    numericColumns,
    onSetXColumn,
    onSetYColumn,
    onSetTimeFormat,
    timeFormat,
  } = props

  // const groupDropdownStatus = stringColumns.length
  //   ? ComponentStatus.Default
  //   : ComponentStatus.Disabled

  // const handleFillColumnSelect = (column: string): void => {
  //   //let updatedFillColumns
  //   const fillColumn = column
  //   // updatedFillColumns = [column]

  //   // if (fillColumns.includes(column)) {
  //   //   // I think this deselects the selected column
  //   //   updatedFillColumns = fillColumns.filter(col => col !== column)
  //   // } else {
  //   //   updatedFillColumns = [...fillColumns, column]
  //   // }

  //   onSetFillColumn(fillColumn)
  // }
  console.log('fillColumn mosaicOptions', fillColumn)

  return (
    <Grid.Column>
      <h4 className="view-options--header">Customize Mosaic Plot</h4>
      <h5 className="view-options--header">Data</h5>
      {/* <Form.Element label="Fill Column">
        <MultiSelectDropdown
          options={stringColumns}
          selectedOptions={fillColumns}
          onSelect={handleFillColumnSelect}
          buttonStatus={groupDropdownStatus}
        />
      </Form.Element> */}
      <ColumnSelector
        selectedColumn={fillColumn}
        onSelectColumn={onSetMosaicFillColumn}
        availableColumns={stringColumns}
        axisName="fill"
      />
      <ColumnSelector
        selectedColumn={xColumn}
        onSelectColumn={onSetXColumn}
        availableColumns={numericColumns}
        axisName="x"
      />
      <ColumnSelector
        selectedColumn={yColumn}
        onSelectColumn={onSetYColumn}
        availableColumns={stringColumns}
        axisName="y"
      />
      <Form.Element label="Time Format">
        <TimeFormat
          timeFormat={timeFormat}
          onTimeFormatChange={onSetTimeFormat}
        />
      </Form.Element>
      <h5 className="view-options--header">Options</h5>
      <Form.Element label="Color Scheme">
        <HexColorSchemeDropdown
          colorSchemes={GIRAFFE_COLOR_SCHEMES}
          selectedColorScheme={colors}
          onSelectColorScheme={onSetColors}
        />
      </Form.Element>
      <h5 className="view-options--header">X Axis</h5>
      <Form.Element label="X Axis Label">
        <Input
          value={xAxisLabel}
          onChange={e => onSetXAxisLabel(e.target.value)}
        />
      </Form.Element>
      <h5 className="view-options--header">Y Axis</h5>
      <Form.Element label="Y Axis Label">
        <Input
          value={yAxisLabel}
          onChange={e => onSetYAxisLabel(e.target.value)}
        />
      </Form.Element>
      <Grid.Row>
        <AxisAffixes
          prefix={yPrefix}
          suffix={ySuffix}
          axisName="y"
          onUpdateAxisPrefix={prefix => onUpdateAxisPrefix(prefix, 'y')}
          onUpdateAxisSuffix={suffix => onUpdateAxisSuffix(suffix, 'y')}
        />
      </Grid.Row>
      <AutoDomainInput
        domain={yDomain as [number, number]}
        onSetDomain={onSetYDomain}
        label="Y Axis Domain"
      />
    </Grid.Column>
  )
}

const mstp = (state: AppState) => {
  const availableGroupColumns = getGroupableColumns(state)
  //const fillColumns = getFillColumnsSelection(state)
  const fillColumn = getMosaicFillColumnsSelection(state)
  const xColumn = getXColumnSelection(state)
  //const yColumn = getYColumnSelection(state)
  const yColumn = getMosaicYColumnSelection(state)
  const stringColumns = getStringColumns(state)
  const numericColumns = getNumericColumns(state)
  const view = getActiveTimeMachine(state).view as NewView<MosaicViewProperties>
  const {timeFormat} = view.properties

  return {
    availableGroupColumns,
    fillColumn,
    xColumn,
    yColumn,
    stringColumns,
    numericColumns,
    timeFormat,
  }
}

const mdtp = {
  onSetMosaicFillColumn: setMosaicFillColumn,
  onSetColors: setColorHexes,
  onSetYAxisLabel: setYAxisLabel,
  onSetXAxisLabel: setXAxisLabel,
  onUpdateAxisPrefix: setAxisPrefix,
  onUpdateAxisSuffix: setAxisSuffix,
  onSetYDomain: setYDomain,
  onSetXColumn: setXColumn,
  onSetYColumn: setYColumn,
  onSetTimeFormat: setTimeFormat,
}

const connector = connect(mstp, mdtp)
export default connector(MosaicOptions)
