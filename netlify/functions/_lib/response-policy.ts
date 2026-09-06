import publicLinks from '../../../src/data/public-links.json';

type PolicyResponse = {
  answer: string;
  sources: Array<{ title: string; url: string }>;
};

const privateContactPattern = /\b(phone|phone number|cell|mobile|email|email address|home address|street address|where (does|is) gabriel live|gabriel'?s location)\b/i;
const privateInfrastructurePattern = /\b(what|which|tell me|show me|reveal|name)\b[\s\S]{0,80}\b(model|llm|database|provider|api endpoint|endpoint|api key|environment variable|system prompt|retrieval threshold|hosting|backend|infrastructure)\b/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
const greetingPattern = /^\s*(hello|hello there|hi|hi there|hey|hey there|good (morning|afternoon|evening)|what'?s up)[!.?\s]*$/i;
const quotePattern = /\b(quote|quotes|qoute|qoutes|quotation|quotations|saying|sayings|philosopher|philosophers|galileo|einstein|nobel|tyson|bacon)\b/i;

export function getPolicyResponse(question: string): PolicyResponse | null {
  if (greetingPattern.test(question)) {
    return {
      answer: "Hello! I’m Gabriel’s AI assistant. How can I help? You can ask me about his experience, projects, skills, or writing.",
      sources: []
    };
  }
  if (quotePattern.test(question)) {
    return {
      answer: "Gabriel is a student of the world’s great philosophers and thinkers. The quotes throughout the portfolio are favorites he has encountered in his reading. They resonate with his belief in innovation, discovery, experimentation, and having the courage to try new things.",
      sources: [{ title: 'Gabriel Pendleton Portfolio', url: 'https://gabrielpendleton.me/' }]
    };
  }
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
    .replace(/[ \t]+-[ \t]+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`)
    .trim();
}
