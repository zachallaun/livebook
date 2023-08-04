import { getAttributeOrThrow, parseBoolean } from "../lib/attribute";
import { cancelEvent, isEditableElement } from "../lib/utils";
import { globalPubSub } from "../lib/pub_sub";

/**
 * A hook for ControlComponent to handle user keyboard interactions.
 *
 * ## Configuration
 *
 *   * `data-cell-id` - id of the cell in which the control is rendered
 *
 *   * `data-disable-default-handlers` - whether keyboard events should be
 *     intercepted and canceled, disabling session shortcuts
 *
 *   * `data-enable-on-cell-focus` - whether the control should be enabled
 *     or disabled when its cell is focused or blurred
 *
 *   * `data-keydown-enabled` - whether keydown events should be listened to
 *
 *   * `data-keyup-enabled` - whether keyup events should be listened to
 *
 *   * `data-target` - the target to send live events to
 */
const KeyboardControl = {
  mounted() {
    this.props = this.getProps();
    this.keyboardEnabled = false;
    this.buttonEl = this.el.querySelector("button");

    this._handleButtonToggle = this.handleButtonToggle.bind(this);
    this._handleDocumentKeyDown = this.handleDocumentKeyDown.bind(this);
    this._handleDocumentKeyUp = this.handleDocumentKeyUp.bind(this);
    this._handleDocumentFocus = this.handleDocumentFocus.bind(this);

    // We bind to mousedown so that the button toggle can be handled
    // prior to the cell focus. Otherwise, if the keyboard control is
    // tied to cell focus, the focus on mousedown will enable the
    // control and the click event fired after mouseup will disable
    // it.
    this.buttonEl.addEventListener("mousedown", this._handleButtonToggle);
    // We intentionally register on window rather than document, to
    // intercept events as early on as possible, even before the
    // session shortcuts
    window.addEventListener("keydown", this._handleDocumentKeyDown, true);
    window.addEventListener("keyup", this._handleDocumentKeyUp, true);
    // Note: the focus event doesn't bubble, so we register for the
    // capture phase
    window.addEventListener("focus", this._handleDocumentFocus, true);

    this.unsubscribeFromNavigationEvents = globalPubSub.subscribe(
      "navigation",
      (event) => this.handleNavigationEvent(event)
    );
  },

  updated() {
    this.props = this.getProps();
  },

  destroyed() {
    this.buttonEl.removeEventListener("click", this._handleButtonToggle);
    window.removeEventListener("keydown", this._handleDocumentKeyDown, true);
    window.removeEventListener("keyup", this._handleDocumentKeyUp, true);
    window.removeEventListener("focus", this._handleDocumentFocus, true);
    this.unsubscribeFromNavigationEvents();
  },

  getProps() {
    return {
      target: getAttributeOrThrow(this.el, "data-target"),
      cellId: getAttributeOrThrow(this.el, "data-cell-id"),
      isKeydownEnabled: getAttributeOrThrow(
        this.el,
        "data-keydown-enabled",
        parseBoolean
      ),
      isKeyupEnabled: getAttributeOrThrow(
        this.el,
        "data-keyup-enabled",
        parseBoolean
      ),
      enableOnCellFocus: getAttributeOrThrow(
        this.el,
        "data-enable-on-cell-focus",
        parseBoolean
      ),
      disableDefaultHandlers: getAttributeOrThrow(
        this.el,
        "data-disable-default-handlers",
        parseBoolean
      ),
    };
  },

  handleButtonToggle(_event) {
    if (this.keyboardEnabled) {
      this.disableKeyboard();
    } else {
      this.enableKeyboard();
    }
  },

  handleDocumentKeyDown(event) {
    if (this.keyboardEnabled && this.props.disableDefaultHandlers) {
      cancelEvent(event);
    }

    if (this.keyboardEnabled && this.props.isKeydownEnabled) {
      if (event.repeat) {
        return;
      }

      const { key } = event;
      this.pushEventTo(this.props.target, "keydown", { key });
    }
  },

  handleDocumentKeyUp(event) {
    if (this.keyboardEnabled && this.props.overrideDefaults) {
      cancelEvent(event);
    }

    if (this.keyboardEnabled && this.props.isKeyupEnabled) {
      const { key } = event;
      this.pushEventTo(this.props.target, "keyup", { key });
    }
  },

  handleDocumentFocus(event) {
    if (
      this.keyboardEnabled &&
      this.props.isKeydownEnabled &&
      isEditableElement(event.target)
    ) {
      this.disableKeyboard();
    }
  },

  handleNavigationEvent(event) {
    if (this.props.enableOnCellFocus) {
      if (event.type === "element_focused") {
        this.handleCellFocused(event);
      } else if (event.type === "insert_mode_changed") {
        this.handleInsertModeChanged(event);
      }
    }
  },

  handleCellFocused(event) {
    if (
      event.focusableId === this.props.cellId &&
      !isEditableElement(document.activeElement)
    ) {
      this.enableKeyboard();
    } else if (event.focusableId !== this.props.cellId) {
      this.disableKeyboard();
    }
  },

  handleInsertModeChanged(event) {
    if (event.enabled && event.focusableId === this.props.cellId) {
      this.disableKeyboard();
    } else if (
      !event.enabled &&
      event.focusableId === this.props.cellId &&
      !isEditableElement(document.activeElement)
    ) {
      this.enableKeyboard();
    }
  },

  enableKeyboard() {
    if (!this.keyboardEnabled) {
      this.keyboardEnabled = true;
      this.buttonEl.classList.remove("button-gray");
      this.buttonEl.classList.add("button-blue");
      this.pushEventTo(this.props.target, "enable_keyboard", {});
    }
  },

  disableKeyboard() {
    if (this.keyboardEnabled) {
      this.keyboardEnabled = false;
      this.buttonEl.classList.remove("button-blue");
      this.buttonEl.classList.add("button-gray");
      this.pushEventTo(this.props.target, "disable_keyboard", {});
    }
  },
};

export default KeyboardControl;
