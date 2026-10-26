import type { AnswerType, FieldKey, FieldStatus, LanguageCode } from '@/lib/notice'

// Labels for the result panels, which are shown in the selected output
// language. To add a language, add its code to LANGUAGES in notice.ts and a
// matching entry here.

type Strings = {
  summary: string
  about: string
  appliesTo: string
  whatToDo: string
  deadline: string
  documents: string
  unclear: string
  facts: string
  missing: string
  checklist: string
  mandatory: string
  suggestions: string
  suggestionNote: string
  noActionStated: string
  evidence: string
  notStatedValue: string
  status: Record<FieldStatus, string>
  answerType: Record<AnswerType, string>
  fields: Record<FieldKey, string>
}

const en: Strings = {
  summary: 'Summary',
  about: 'What this notice is about',
  appliesTo: 'Who it applies to',
  whatToDo: 'What you need to do',
  deadline: 'Deadline',
  documents: 'Documents to prepare',
  unclear: 'Unclear or missing',
  facts: 'Key facts',
  missing: 'Not stated in the notice',
  checklist: 'Action checklist',
  mandatory: 'Required by the notice',
  suggestions: 'Suggestions (not official requirements)',
  suggestionNote: 'These steps are helpful ideas. The notice does not require them.',
  noActionStated: 'The notice does not clearly state what action to take.',
  evidence: 'Source',
  notStatedValue: 'Not stated',
  status: { stated: 'Stated', not_stated: 'Not stated', uncertain: 'Needs checking', user_confirmed: 'Confirmed by you' },
  answerType: { stated: 'Found in notice', not_stated: 'Not stated', uncertain: 'Uncertain', out_of_scope: 'Not about this notice' },
  fields: {
    title: 'Notice title',
    issuing_organization: 'Issuing organization',
    purpose: 'Purpose',
    eligibility: 'Eligibility',
    deadline: 'Deadline',
    event_datetime: 'Event date and time',
    venue: 'Venue or location',
    required_documents: 'Required documents',
    application_steps: 'Application steps',
    fees: 'Fees',
    contact: 'Contact information',
    official_url: 'Official URL',
    required_action: 'Required action',
    other_instructions: 'Other instructions',
  },
}

const hi: Strings = {
  summary: 'सारांश',
  about: 'यह सूचना किस बारे में है',
  appliesTo: 'यह किस पर लागू होती है',
  whatToDo: 'आपको क्या करना है',
  deadline: 'अंतिम तिथि',
  documents: 'तैयार रखने वाले दस्तावेज़',
  unclear: 'अस्पष्ट या अनुपलब्ध',
  facts: 'मुख्य तथ्य',
  missing: 'सूचना में नहीं बताया गया',
  checklist: 'कार्य सूची',
  mandatory: 'सूचना द्वारा आवश्यक',
  suggestions: 'सुझाव (आधिकारिक आवश्यकता नहीं)',
  suggestionNote: 'ये कदम सहायक सुझाव हैं। सूचना में इनकी आवश्यकता नहीं बताई गई है।',
  noActionStated: 'सूचना में स्पष्ट रूप से नहीं बताया गया है कि क्या करना है।',
  evidence: 'स्रोत',
  notStatedValue: 'नहीं बताया गया',
  status: { stated: 'बताया गया', not_stated: 'नहीं बताया गया', uncertain: 'जाँच आवश्यक', user_confirmed: 'आपके द्वारा पुष्टि' },
  answerType: { stated: 'सूचना में मिला', not_stated: 'नहीं बताया गया', uncertain: 'अनिश्चित', out_of_scope: 'इस सूचना से संबंधित नहीं' },
  fields: {
    title: 'सूचना का शीर्षक',
    issuing_organization: 'जारी करने वाली संस्था',
    purpose: 'उद्देश्य',
    eligibility: 'पात्रता',
    deadline: 'अंतिम तिथि',
    event_datetime: 'कार्यक्रम की तिथि और समय',
    venue: 'स्थान',
    required_documents: 'आवश्यक दस्तावेज़',
    application_steps: 'आवेदन के चरण',
    fees: 'शुल्क',
    contact: 'संपर्क जानकारी',
    official_url: 'आधिकारिक वेबसाइट',
    required_action: 'आवश्यक कार्य',
    other_instructions: 'अन्य निर्देश',
  },
}

const STRINGS: Record<LanguageCode, Strings> = { en, hi }

export function t(lang: LanguageCode): Strings {
  return STRINGS[lang] ?? en
}
