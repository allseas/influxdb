// Libraries
import React, {PureComponent, StatelessComponent} from 'react'
import classnames from 'classnames'
import {ErrorHandling} from 'src/shared/decorators/errors'
import ProtoboardIcon from 'src/clockface/components/card_select/ProtoboardIcon'

interface Props {
  id: string
  name?: string
  label: string
  image?: StatelessComponent
  checked?: boolean
  disabled?: boolean
  onClick: () => void
  testID?: string
}

@ErrorHandling
class CardSelectCard extends PureComponent<Props> {
  public static defaultProps: Partial<Props> = {
    checked: false,
    disabled: false,
    testID: 'select-card'
  }

  public render() {
    const {id, label, checked, name, disabled, testID} = this.props
    return (
      <div
        data-toggle="card_toggle"
        data-testid={testID}
        onClick={this.handleClick}
        className={classnames('card-select--card', {
          'card-select--checked': checked,
          'card-select--disabled': disabled,
          'card-select--active': !disabled,
        })}
      >
        <label className="card-select--container">
          <input
            id={`card_select_${id}`}
            name={name}
            type="checkbox"
            value={id}
            defaultChecked={checked}
            disabled={disabled}
          />
          <span
            className={classnames(
              'card-select--checkmark',
              'icon',
              'checkmark',
              {
                'card-select--checked': checked,
              }
            )}
          />
          <div className="card-select--image">{this.cardImage}</div>
          <span className="card-select--label">{label}</span>
        </label>
      </div>
    )
  }

  private get cardImage(): JSX.Element {
    const {image, label} = this.props

    if (image) {
      return React.createElement(image)
    }

    return <ProtoboardIcon displayText={label} />
  }

  private handleClick = e => {
    const {onClick, disabled} = this.props
    e.preventDefault()
    if (!disabled) {
      onClick()
    }
  }
}

export default CardSelectCard
