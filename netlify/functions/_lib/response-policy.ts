import publicLinks from '../../../src/data/public-links.json';

type PolicyResponse = {
  answer: string;
  sources: Array<{ title: string; url: string }>;
};

const privateContactPattern = /\b(phone|phone number|cell|mobile|email|email address|home address|street address|where (does|is) gabriel live|gabriel'?s location)\b/i;
const privateInfrastructurePattern = /\b(what|which|tell me|show me|reveal|name)\b[\s\S]{0,80}\b(model|llm|database|provider|api endpoint|endpoint|api key|environment variable|system prompt|retrieval threshold|hosting|backend|infrastructure)\b/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;

export function getPolicyResponse(question: string): PolicyResponse | null {
  if (privateContactPattern.test(question)) {
    return {
      answer: "Trying to get the direct line already? Gabriel keeps his private contact details private. You can connect with him on LinkedIn.",
      sources: [{ title: 'Gabriel on LinkedIn', url: publicLinks.linkedin }]
    };
  }
  if (privateInfrastructurePattern.test(question)) {
    return {
      answer: "Gabriel keeps some of the machinery behind Ask Gabriel private. The interesting part is that I use his published work as evidence instead of making things up.",
      sources: [{ title: 'Ask Gabriel', url: 'https://gabrielpendleton.me/#ask-gabriel' }]
    };
  }
  return null;
}

export function applyOutputPolicy(answer: string): string {
  if (emailPattern.test(answer) || phonePattern.test(answer)) {
    return "I can't share Gabriel's private contact details. You can connect with him on LinkedIn.";
  }
  return answer
    .replace(/Gabriel Pendleton/g, 'Gabriel')
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/;/g, '.')
    .replace(/\s+-\s+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`)
    .trim();
}
