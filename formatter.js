const INDENT_SIZE = 4;
const BRACE_CHILD_INCREMENT = 4;
const BRACE_MIN_CHILD_INDENT = 8;

function splitComment(line) {
  let inString = false;
  let escape = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) {
        escape = true;
      }
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString && ch === ';') {
      return {
        code: line.slice(0, i),
        comment: line.slice(i)
      };
    }
  }
  return { code: line, comment: '' };
}

function matchingOpen(ch) {
  if (ch === ')') {
    return '(';
  }
  if (ch === ']') {
    return '[';
  }
  return '{';
}

function cloneStack(stack) {
  return stack.map((ctx) => ({ ...ctx }));
}

function getLineIndent(code, stack) {
  if (!code || code.trim().length === 0) {
    if (stack.length === 0) {
      return 0;
    }
    return stack[stack.length - 1].childIndent;
  }

  const preview = cloneStack(stack);
  let indent = preview.length === 0 ? 0 : preview[preview.length - 1].childIndent;
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === ' ' || ch === '\t') {
      i += 1;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      const target = matchingOpen(ch);
      let popped = null;
      while (preview.length > 0) {
        const ctx = preview.pop();
        if (!popped) {
          popped = ctx;
        }
        if (ctx.type === target) {
          break;
        }
      }
      indent = popped ? popped.indent : 0;
      i += 1;
      continue;
    }
    break;
  }
  return indent;
}

function popMatching(stack, target) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const ctx = stack.pop();
    if (ctx.type === target) {
      return;
    }
  }
}

function updateContextStack(code, indent, stack) {
  if (!code || code.length === 0) {
    return;
  }
  let inString = false;
  let escape = false;
  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) {
        escape = true;
      }
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (ch === ';') {
      break;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      const indentSize = ch === '{'
        ? Math.max(indent + BRACE_CHILD_INCREMENT, BRACE_MIN_CHILD_INDENT)
        : indent + INDENT_SIZE;
      stack.push({
        type: ch,
        indent,
        childIndent: indentSize
      });
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      popMatching(stack, matchingOpen(ch));
      continue;
    }
  }
}

function splitSegments(trimmedCode, stackClosingBrackets) {
  if (!trimmedCode || trimmedCode.length === 0) {
    return [''];
  }
  if (stackClosingBrackets) {
    return [trimmedCode];
  }
  let end = trimmedCode.length - 1;
  const closings = [];
  while (end >= 0) {
    const ch = trimmedCode[end];
    if (ch === ')' || ch === ']' || ch === '}') {
      closings.push(ch);
      end -= 1;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      end -= 1;
      continue;
    }
    break;
  }
  const base = trimmedCode.slice(0, end + 1).replace(/\s+$/, '');
  if (base.length === 0) {
    if (closings.length === 0) {
      return [''];
    }
    const closingOnly = [];
    for (let i = closings.length - 1; i >= 0; i -= 1) {
      closingOnly.push(closings[i]);
    }
    return closingOnly;
  }
  if (closings.length <= 1) {
    return [trimmedCode];
  }
  const segments = [base];
  for (let i = closings.length - 1; i >= 0; i -= 1) {
    segments.push(closings[i]);
  }
  return segments;
}

function buildLine(code, comment, indent) {
  const indentation = ' '.repeat(indent);
  let hasCode = code && code.trim().length > 0;
  let text = '';
  if (hasCode) {
    text = indentation + code.trimStart().replace(/\s+$/, '');
  }

  if (comment && comment.trim().length > 0) {
    const cleanedComment = comment.trimStart();
    if (hasCode) {
      text = text.replace(/\s+$/, '');
      const separator = text.endsWith(' ') ? '' : '  ';
      text += separator + cleanedComment;
    } else {
      text = indentation + cleanedComment;
    }
  }

  return text.replace(/\s+$/, '');
}

function formatLispBM(text, options = {}) {
  const { stackClosingBrackets = true } = options;
  const endsWithNewline = /\r?\n$/.test(text);
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const formattedLines = [];
  const contextStack = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().length === 0) {
      formattedLines.push('');
      continue;
    }

    const { code, comment } = splitComment(line);
    const trimmedCode = code.trim();

    if (trimmedCode.length === 0 && comment.trim().length === 0) {
      formattedLines.push('');
      continue;
    }

    if (trimmedCode.length === 0) {
      const indent = getLineIndent('', contextStack);
      const formattedComment = buildLine('', comment, indent);
      formattedLines.push(formattedComment);
      continue;
    }

    const segments = splitSegments(trimmedCode, stackClosingBrackets);
    for (let segIndex = 0; segIndex < segments.length; segIndex += 1) {
      const segment = segments[segIndex];
      const commentPart = segIndex === 0 ? comment : '';
      const indent = getLineIndent(segment, contextStack);
      const formatted = buildLine(segment, commentPart, indent);
      formattedLines.push(formatted);
      updateContextStack(segment, indent, contextStack);
    }
  }

  let result = formattedLines.join('\n');
  if (endsWithNewline && !result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}

module.exports = {
  formatLispBM
};
