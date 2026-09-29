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
const identityPattern = /\b(are you (really )?gabriel|are you (an|the) ai|are you human|is this (really )?gabriel|who are you)\b/i;
const manipulationPattern = /\b(ignore (all |any )?(previous|prior|system|developer) instructions?|reveal (the )?(system prompt|instructions?)|pretend (you are|to be)|act as|repeat after me|say exactly)\b/i;
const appendedCommandPattern = /\s+(?:and\s+)?(?:when you respond|in your response|before you answer|after you answer|then say|repeat after me|say exactly)\b[\s\S]*$/i;

export function sanitizeVisitorQuestion(question: string) {
  return question.replace(appendedCommandPattern, '').trim();
}

export function getPolicyResponse(question: string): PolicyResponse | null {
  if (identityPattern.test(question)) {
    return { answer: "I’m Gabriel’s AI digital counterpart, not the human Gabriel. I answer from his published portfolio knowledge and show the sources behind my responses.", sources: [] };
  }
  if (manipulationPattern.test(question)) {
    return {
      answer: "I can answer questions about Gabriel’s published work, experience, projects, and writing, but I can’t follow instructions that change my role or override my safeguards.",
      sources: []
    };
  }
  if (greetingPattern.test(question)) {
    return {
      answer: "Hello! I’m Gabriel’s AI assistant. How can I help? You can ask me about my experience, projects, skills, or writing.",
      sources: []
    };
  }
  if (quotePattern.test(question)) {
    return {
      answer: "I study the world’s great philosophers and thinkers. The quotes throughout my portfolio are favorites I have encountered in my reading. They resonate with my belief in innovation, discovery, experimentation, and having the courage to try new things.",
      sources: [{ title: 'Gabriel Pendleton Portfolio', url: 'https://gabrielpendleton.me/' }]
    };
  }
  if (privateContactPattern.test(question)) {
    return {
      answer: "Trying to get the direct line already? I keep my private contact details private. You can connect with me on LinkedIn.",
      sources: [{ title: 'Gabriel on LinkedIn', url: publicLinks.linkedin }]
    };
  }
  if (privateInfrastructurePattern.test(question)) {
    return {
      answer: "I keep some of the machinery behind Ask Gabriel private. The interesting part is that I use my published work as evidence instead of making things up.",
      sources: [{ title: 'Ask Gabriel', url: 'https://gabrielpendleton.me/#ask-gabriel' }]
    };
  }
  return null;
}

export function applyOutputPolicy(answer: string): string {
  if (emailPattern.test(answer) || phonePattern.test(answer)) {
    return "I can't share my private contact details. You can connect with me on LinkedIn.";
  }
  return answer
    .replace(/\bAsk Gabriel\b/g, '__ASK_GABRIEL_PRODUCT__')
    .replace(/\bGabriel Pendleton Portfolio\b/g, 'my portfolio')
    .replace(/\b(?:Gabriel Pendleton|Gabriel)[’']s\b/g, 'my')
    .replace(/\bGabriel Pendleton\b|\bGabriel\b/g, 'I')
    .replace(/\bHis\b/g, 'My')
    .replace(/\bhis\b/g, 'my')
    .replace(/\bHe\b/g, 'I')
    .replace(/\bhe\b/g, 'I')
    .replace(/\bHim\b/g, 'Me')
    .replace(/\bhim\b/g, 'me')
    .replace(/\bHimself\b/g, 'Myself')
    .replace(/\bhimself\b/g, 'myself')
    .replace(/\bI is\b/g, 'I am')
    .replace(/\bI has\b/g, 'I have')
    .replace(/\bI does\b/g, 'I do')
    .replace(/\bI works\b/g, 'I work')
    .replace(/\bI builds\b/g, 'I build')
    .replace(/\bI leads\b/g, 'I lead')
    .replace(/\bI uses\b/g, 'I use')
    .replace(/\bI keeps\b/g, 'I keep')
    .replace(/\bI believes\b/g, 'I believe')
    .replace(/\bI focuses\b/g, 'I focus')
    .replace(/\bI creates\b/g, 'I create')
    .replace(/\bI describes\b/g, 'I describe')
    .replace(/\bI answers\b/g, 'I answer')
    .replace(/\bI writes\b/g, 'I write')
    .replace(/__ASK_GABRIEL_PRODUCT__/g, 'Ask Gabriel')
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/;/g, '.')
    .replace(/[ \t]+-[ \t]+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`)
    .trim();
}
