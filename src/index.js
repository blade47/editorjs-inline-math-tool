import katex from 'katex';
import 'katex/dist/katex.min.css';
import { IconBrackets } from '@codexteam/icons';

import './index.css';
import { validateLaTeX } from './latexValidator';
import { KATEX_INLINE_OPTIONS } from './katexMacros';

class InlineMathTool {
  static get CSS() {
    return 'afl-inline-latex';
  }

  static get EVENT_LISTENER() {
    return 'im-has-data-listener';
  }

  static get isInline() {
    return true;
  }

  static get sanitize() {
    return {
      latex: {
        contenteditable: true,
        style: true,
      },
      span: function (el) {
        return (
          el.classList.contains('katex') ||
          el.classList.contains('katex-mathml') ||
          el.classList.contains('katex-html') ||
          el.classList.contains('base') ||
          el.classList.contains('strut') ||
          el.classList.contains('mord') ||
          el.classList.contains('afl-inline-latex') ||
          el.classList.length === 0
        );
      },
      math: true,
      semantics: true,
      mrow: true,
      mi: true,
    };
  }

  static get shortcut() {
    return 'CMD+M';
  }

  static get title() {
    return 'LaTeX';
  }

  constructor({ api, data, config }) {
    this.api = api;
    this.button = null;
    this.tag = 'LATEX';
    this.data = data;
    this.config = config || {};

    this.iconClasses = {
      base: this.api.styles.inlineToolButton,
      active: this.api.styles.inlineToolButtonActive,
    };

    this.updateAndRenderLatex = this.updateAndRenderLatex.bind(this);
    this.renderEquationOverlay = this.renderEquationOverlay.bind(this);
    this.removeEquationOverlay = this.removeEquationOverlay.bind(this);
    this.repositionEquationArea = this.repositionEquationArea.bind(this);
    this.addEventListenersToAll();
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add('inline-math-tool-button');
    this.button.classList.add(this.iconClasses.base);
    this.button.innerHTML = IconBrackets;

    return this.button;
  }

  surround(range) {
    if (!range) {
      return;
    }

    const termWrapper = this.api.selection.findParentTag(this.tag);

    const fragment = range.cloneContents();
    const latex = fragment.querySelectorAll(`span.${InlineMathTool.CSS}`);
    if (latex.length > 1) {
      return;
    } else if (latex.length === 0) {
      this.wrap(range);
    } else if (termWrapper) {
      this.renderEquationOverlay(termWrapper);
    }
  }

  wrap(range) {
    const selectedText = range.extractContents().textContent.trim();

    if (selectedText.length < 1) {
      return;
    }

    const wrapper = document.createElement(this.tag);
    wrapper.style.display = 'inline-block';
    wrapper.setAttribute('contenteditable', 'false');

    const latexElem = document.createElement('span');
    latexElem.classList.add(InlineMathTool.CSS);
    latexElem.style.display = 'none';
    latexElem.innerText = selectedText;

    const formulaElem = document.createElement('span');
    formulaElem.innerText = selectedText;

    wrapper.appendChild(latexElem);
    wrapper.appendChild(formulaElem);

    range.insertNode(wrapper);

    this.api.selection.expandToTag(wrapper);

    this.renderFormula(formulaElem);
    this.addEventListeners(wrapper);

    // Show popup immediately for validation
    // This ensures users validate before committing
    setTimeout(() => {
      this.renderEquationOverlay(wrapper);
    }, 100);
  }

  checkState() {
    const termTag = this.api.selection.findParentTag(this.tag, InlineMathTool.CSS);

    this.button.classList.toggle(this.iconClasses.active, !!termTag);
  }

  /**
   * Renders inline LaTeX formula using KaTeX
   *
   * Uses inline mode (displayMode: false) to match backend rendering.
   * Backend wraps inline math in $...$ which uses inline mode.
   *
   * Backend reference: LatexUtils.kt findAndReplaceInlineLatex
   */
  renderFormula(element) {
    try {
      const formula = element.innerText || '';
      katex.render(formula, element, KATEX_INLINE_OPTIONS);
    } catch (error) {
      element.textContent = error.message;
    }
  }

  addEventListeners(latexTag) {
    if (!latexTag.hasAttribute(InlineMathTool.EVENT_LISTENER)) {
      latexTag.addEventListener('click', (e) => {
        this.stopEventPropagation(e);
        this.renderEquationOverlay(latexTag);
      });
      latexTag.setAttribute(InlineMathTool.EVENT_LISTENER, 'true');
    }
  }

  removeEquationOverlay() {
    const existingEquationOverlays = document.querySelectorAll('div.inline-math-tool-overlay');
    existingEquationOverlays.forEach((equationOverlay) => {
      equationOverlay.removeEventListener('click', this.stopEventPropagation);
      equationOverlay.remove();
    });
    document.body.removeEventListener('click', this.removeEquationOverlay);
  }

  renderEquationOverlay(latexTag) {
    if (latexTag.querySelectorAll('div.inline-math-tool-overlay').length > 0) {
      return;
    }
    const equationOverlay = document.createElement('div');
    equationOverlay.classList.add('inline-math-tool-overlay');
    equationOverlay.addEventListener('click', this.stopEventPropagation);

    this.createEquationArea(
      latexTag,
      equationOverlay,
      latexTag.querySelector(`span.${InlineMathTool.CSS}`)?.innerHTML ?? ''
    );

    latexTag.appendChild(equationOverlay);
    this.repositionEquationArea(latexTag, equationOverlay);
    this.observeEquationOverlayResize(latexTag, equationOverlay);
    document.body.addEventListener('click', this.removeEquationOverlay);
  }

  stopEventPropagation(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  createEquationArea(latexTag, equationContainer, equation) {
    const textAreaWrapper = document.createElement('div');
    textAreaWrapper.classList.add('inline-math-tool-textarea-wrapper');

    const textarea = document.createElement('textarea');
    textarea.id = 'inline-math-tool-textarea';
    textarea.placeholder = 'Write LaTeX code here...';
    textarea.value = equation;
    textarea.classList.add('inline-math-tool-textarea');

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.classList.add('inline-math-button-wrapper');
    const doneButton = document.createElement('button');
    doneButton.innerText = 'Done ↵';
    doneButton.classList.add('inline-math-done-button', 'inline-math-done-button-color');

    // Validate on input and enable/disable button
    const validateAndUpdateButton = () => {
      const text = textarea.value.trim();
      const validationResult = validateLaTeX(text);

      if (!validationResult.isValid && validationResult.errors.length > 0) {
        // Disable button and show errors
        doneButton.disabled = true;
        doneButton.style.opacity = '0.5';
        doneButton.style.cursor = 'not-allowed';

        // Show error notifications
        validationResult.errors.forEach((error) => {
          this.api.notifier.show({
            message: `LaTeX Error: ${error}`,
            style: 'error',
            time: 5000,
          });
        });
      } else {
        // Enable button
        doneButton.disabled = false;
        doneButton.style.opacity = '1';
        doneButton.style.cursor = 'pointer';
      }
    };

    textarea.oninput = validateAndUpdateButton;

    textarea.onkeydown = (event) => {
      if (event.key === 'Enter' && !doneButton.disabled) {
        event.preventDefault();
        event.stopPropagation();
        this.updateAndRenderLatex(latexTag, textarea, equationContainer);
      }
    };

    doneButton.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!doneButton.disabled) {
        this.updateAndRenderLatex(latexTag, textarea, equationContainer);
      }
    };

    buttonsWrapper.appendChild(doneButton);

    textAreaWrapper.appendChild(textarea);
    equationContainer.appendChild(textAreaWrapper);
    equationContainer.appendChild(buttonsWrapper);
    textarea.focus();

    // Initial validation
    validateAndUpdateButton();
  }

  /**
   * Updates and renders inline LaTeX
   *
   * Note: Validation is handled by button state, so this only runs when valid
   */
  updateAndRenderLatex(latexTag, textarea, equationContainer) {
    const text = textarea.value.trim();

    // Remove old formula spans
    const allSpans = latexTag.querySelectorAll('span');
    allSpans.forEach((latexSpan) => {
      if (!latexSpan.classList.contains(InlineMathTool.CSS)) {
        latexSpan.remove();
      }
    });

    // Update LaTeX source and render
    const formulaElem = document.createElement('span');
    formulaElem.innerText = text;
    latexTag.querySelector(`span.${InlineMathTool.CSS}`).innerText = text;

    latexTag.appendChild(formulaElem);
    this.renderFormula(formulaElem);
    latexTag.removeChild(equationContainer);
    document.body.removeEventListener('click', this.removeEquationOverlay);
  }

  addEventListenersToAll() {
    document.querySelectorAll(this.tag).forEach((latexTag) => {
      this.addEventListeners(latexTag);
    });
  }

  repositionEquationArea(target, overlay) {
    const overlayRect = overlay.getBoundingClientRect();
    const overlayHeight = overlayRect.height;
    const maxHeight =
      this.config.repositionOverlay?.(target, overlay) ??
      this.repositionOverlay(target, overlay, this.config.bufferSpacing ?? 0);
    const targetRect = target.getBoundingClientRect();

    const spacing = 10;

    overlay.style.top = `${top}px`;
    overlay.style.maxHeight = `${maxHeight}px`;

    const textAreaWrapper = target.querySelector('div.inline-math-tool-textarea-wrapper');
    if (textAreaWrapper) {
      const textAreaWrapperRect = textAreaWrapper.getBoundingClientRect();
      textAreaWrapper.style.maxHeight = `${maxHeight * (textAreaWrapperRect.height / overlayHeight)}px`; // Adjust textarea height
    }
  }

  repositionOverlay(target, overlay, bufferSpacing) {
    const overlayRect = overlay.getBoundingClientRect();
    const overlayHeight = overlayRect.height;
    const targetRect = target.getBoundingClientRect();
    const spacing = 10;

    // Calculate available space
    const spaceAbove = targetRect.top;
    const spaceBelow = window.innerHeight - targetRect.bottom;

    // Decide position and height
    let top;
    let maxHeight;
    if (spaceBelow >= overlayHeight || spaceBelow >= spaceAbove) {
      // Position below
      top = targetRect.height + spacing;
      maxHeight = spaceBelow - spacing - bufferSpacing;
    } else {
      // Position above
      maxHeight = spaceAbove - spacing - bufferSpacing;
      top = -Math.min(overlayHeight, maxHeight) - spacing;
    }

    overlay.style.top = `${top}px`;
    overlay.style.maxHeight = `${maxHeight}px`;
    return maxHeight;
  }

  observeEquationOverlayResize(target, overlay) {
    const resizeObserver = new ResizeObserver(() => {
      this.repositionEquationArea(target, overlay);
    });

    // Watch both the overlay AND the target (latex wrapper)
    // So popup stays anchored if formula height changes
    resizeObserver.observe(overlay);
    resizeObserver.observe(target);
  }
}

export default InlineMathTool;
