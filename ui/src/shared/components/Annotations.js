import React, {PropTypes, Component} from 'react'
import {connect} from 'react-redux'
import {bindActionCreators} from 'redux'

import Annotation from 'src/shared/components/Annotation'
import NewAnnotation from 'src/shared/components/NewAnnotation'
import * as schema from 'src/shared/schemas'

import {ADDING, TEMP_ANNOTATION} from 'src/shared/annotations/helpers'

import {
  updateAnnotation,
  addingAnnotationSuccess,
  dismissAddingAnnotation,
  mouseEnterTempAnnotation,
  mouseLeaveTempAnnotation,
} from 'src/shared/actions/annotations'
import {getAnnotations} from 'src/shared/annotations/helpers'

class Annotations extends Component {
  state = {
    dygraph: null,
  }

  componentDidMount() {
    this.props.annotationsRef(this)
  }

  render() {
    const {dygraph} = this.state
    const {
      mode,
      isTempHovering,
      handleUpdateAnnotation,
      handleDismissAddingAnnotation,
      handleAddingAnnotationSuccess,
      handleMouseEnterTempAnnotation,
      handleMouseLeaveTempAnnotation,
    } = this.props

    if (!dygraph) {
      return null
    }

    const annotations = getAnnotations(dygraph, this.props.annotations)
    const tempAnnotation = this.props.annotations.find(
      a => a.id === TEMP_ANNOTATION.id
    )

    return (
      <div className="annotations-container">
        {mode === ADDING &&
          tempAnnotation &&
          <NewAnnotation
            dygraph={dygraph}
            tempAnnotation={tempAnnotation}
            onDismissAddingAnnotation={handleDismissAddingAnnotation}
            onAddingAnnotationSuccess={handleAddingAnnotationSuccess}
            onUpdateAnnotation={handleUpdateAnnotation}
            isTempHovering={isTempHovering}
            onMouseEnterTempAnnotation={handleMouseEnterTempAnnotation}
            onMouseLeaveTempAnnotation={handleMouseLeaveTempAnnotation}
          />}
        {annotations.map(a =>
          <Annotation key={a.id} mode={mode} annotation={a} dygraph={dygraph} />
        )}
      </div>
    )
  }
}

const {arrayOf, bool, func, string} = PropTypes

Annotations.propTypes = {
  annotations: arrayOf(schema.annotation),
  mode: string,
  isTempHovering: bool,
  annotationsRef: func,
  handleUpdateAnnotation: func.isRequired,
  handleDismissAddingAnnotation: func.isRequired,
  handleAddingAnnotationSuccess: func.isRequired,
  handleMouseEnterTempAnnotation: func.isRequired,
  handleMouseLeaveTempAnnotation: func.isRequired,
}

const mapStateToProps = ({
  annotations: {annotations, mode, isTempHovering},
}) => ({
  annotations,
  mode: mode || 'NORMAL',
  isTempHovering,
})

const mapDispatchToProps = dispatch => ({
  handleAddingAnnotationSuccess: bindActionCreators(
    addingAnnotationSuccess,
    dispatch
  ),
  handleDismissAddingAnnotation: bindActionCreators(
    dismissAddingAnnotation,
    dispatch
  ),
  handleMouseEnterTempAnnotation: bindActionCreators(
    mouseEnterTempAnnotation,
    dispatch
  ),
  handleMouseLeaveTempAnnotation: bindActionCreators(
    mouseLeaveTempAnnotation,
    dispatch
  ),
  handleUpdateAnnotation: bindActionCreators(updateAnnotation, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(Annotations)
