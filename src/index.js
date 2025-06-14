import katex from 'katex';
import 'katex/dist/katex.min.css';

import './index.css';

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

  constructor({ api, data }) {
    this.api = api;
    this.button = null;
    this.tag = 'LATEX';
    this.data = data;

    this.iconClasses = {
      base: this.api.styles.inlineToolButton,
      active: this.api.styles.inlineToolButtonActive,
    };

    this.updateAndRenderLatex = this.updateAndRenderLatex.bind(this);
    this.renderEquationOverlay = this.renderEquationOverlay.bind(this);
    this.removeEquationOverlay = this.removeEquationOverlay.bind(this);
    this.addEventListenersToAll();
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add('inline-math-latex-tool-button');
    this.button.classList.add(this.iconClasses.base);

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
    } else if (latex.length == 0) {
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
  }

  checkState() {
    const termTag = this.api.selection.findParentTag(this.tag, InlineMathTool.CSS);

    this.button.classList.toggle(this.iconClasses.active, !!termTag);
  }

  renderFormula(element) {
    try {
      const formula = element.innerText || '';
      katex.render(formula, element, {
        throwOnError: false,
      });
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
    const existingEquationOverlays = document.querySelectorAll('div.inline-math-equation-overlay');
    existingEquationOverlays.forEach((equationOverlay) => {
      equationOverlay.removeEventListener('click', this.stopEventPropagation);
      equationOverlay.remove();
    });
    document.body.removeEventListener('click', this.removeEquationOverlay);
  }

  renderEquationOverlay(latexTag) {
    if (latexTag.querySelectorAll('div.inline-math-equation-overlay').length > 0) {
      return;
    }
    const equationOverlay = document.createElement('div');
    equationOverlay.classList.add('inline-math-equation-overlay');
    equationOverlay.addEventListener('click', this.stopEventPropagation);

    this.createEquationWrapper(
      latexTag,
      equationOverlay,
      latexTag.querySelector(`span.${InlineMathTool.CSS}`)?.innerHTML ?? ''
    );

    latexTag.appendChild(equationOverlay);
    document.body.addEventListener('click', this.removeEquationOverlay);
  }

  stopEventPropagation(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  createEquationWrapper(latexTag, equationContainer, equation) {
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Write LaTeX code here...';
    textarea.value = equation;
    textarea.classList.add('inline-math-equation-textarea-latex-tool');

    textarea.onkeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        this.updateAndRenderLatex(latexTag, textarea, equationContainer);
      }
    };

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.classList.add('inline-math-button-wrapper');
    const doneButton = document.createElement('button');
    doneButton.innerText = 'Done ↵';
    doneButton.classList.add('inline-math-done-button', 'inline-math-done-button-color');
    doneButton.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.updateAndRenderLatex(latexTag, textarea, equationContainer);
    };

    buttonsWrapper.appendChild(doneButton);

    equationContainer.appendChild(textarea);
    equationContainer.appendChild(buttonsWrapper);
    textarea.focus();
  }

  updateAndRenderLatex(latexTag, textarea, equationContainer) {
    const allSpans = latexTag.querySelectorAll('span');
    allSpans.forEach((latexSpan) => {
      if (!latexSpan.classList.contains(InlineMathTool.CSS)) {
        latexSpan.remove();
      }
    });
    const formulaElem = document.createElement('span');
    formulaElem.innerText = textarea.value;
    latexTag.querySelector(`span.${InlineMathTool.CSS}`).innerText = textarea.value;

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
}

export default InlineMathTool;
