/**
 * HTML Sanitization Utility
 * Removes dangerous HTML elements and attributes to prevent XSS attacks
 */

export function sanitizeHtml(html: string): string {
  // Create a temporary DOM element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // List of allowed HTML tags  
  const allowedTags = ['p', 'a', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'img', 'br'];

  // List of allowed attributes per tag
  const allowedAttributes: Record<string, string[]> = {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'width', 'height'],
    'h1': [],
    'h2': [],
    'h3': [],
    'h4': [],
    'h5': [],
    'h6': [],
    'p': [],
    'strong': [],
    'em': [],
    'u': [],
    'ul': [],
    'ol': [],
    'li': [],
    'blockquote': [],
    'br': [],
  };

  function sanitizeNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Remove disallowed tags
      if (!allowedTags.includes(tagName)) {
        // Keep text content of disallowed tags
        const fragment = document.createDocumentFragment();
        for (const child of Array.from(element.childNodes)) {
          const sanitized = sanitizeNode(child);
          if (sanitized) {
            fragment.appendChild(sanitized);
          }
        }
        return fragment;
      }

      // Create new element with same tag
      const newElement = document.createElement(tagName);

      // Copy only allowed attributes
      const allowedAttrs = allowedAttributes[tagName] || [];
      for (const attr of Array.from(element.attributes)) {
        if (allowedAttrs.includes(attr.name.toLowerCase())) {
          // Validate URL attributes to prevent javascript: URLs
          if (attr.name === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
            continue;
          }
          if (attr.name === 'src' && attr.value.toLowerCase().startsWith('javascript:')) {
           continue;
          }
          newElement.setAttribute(attr.name, attr.value);
        }
      }

      // Recursively sanitize children
      for (const child of Array.from(element.childNodes)) {
        const sanitized = sanitizeNode(child);
        if (sanitized) {
          newElement.appendChild(sanitized);
        }
      }

      return newElement;
    }

    return null;
  }

  const sanitized = sanitizeNode(tempDiv);
  if (sanitized && sanitized.nodeType === Node.ELEMENT_NODE) {
    return (sanitized as Element).innerHTML;
  }
  return '';
}
