const path = require('path');

const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);

const FOLDERS = {
  root: env('FOLDER_ROOT', '1DqwKNfgCL4PuD8obN9zSO8JPzmrAZ0h_'),
  templates: env('FOLDER_TEMPLATES', '1yoNacQAEcjU-xp40tE7DWlCj-F--vlWU'),
  petitions: env('FOLDER_PETITIONS', '1lt_wtPZ1yIc7wS-tTbsK_e6ojai15R9m'),
  inquiries: env('FOLDER_INQUIRIES', '11Ok187S0QKzItNNV2o1ZwpBhMehkiPhd'),
  licenses: env('FOLDER_LICENSES', '1Jn-RlDGTnEMyNqAvNKEp4oM1dlirAcUZ'),
  personnel: env('FOLDER_PERSONNEL', '1GJu3pnnbqAHDTwXmVuHEJ2lhdBeiGGHY'),
  directives: env('FOLDER_DIRECTIVES', '1IlsuF2AKXhZYoOLmXE9FUJvSjz-TQvMp'),
  envoys: env('FOLDER_ENVOYS', '18Ytb49GBd18Q6Hm3VfieiOOdBr3cC-_c'),
  register: env('FOLDER_REGISTER', '1qmcAPrvwo8ltg_xSIK3jhtVLMSe4F7fV'),
  press: env('FOLDER_PRESS', '1YHZyMVwYaAbNWm8Pa5hKsAlraXI2xUWP'),
  heraldry: env('FOLDER_HERALDRY', '1_Go_hc82E6cyDA7hzCkbLYKkPCjSF7x3'),
  seals: env('FOLDER_SEALS', '1u3lpe9TgKZc5MmTYxHqrggUbCIyWPqc7'),
  correspondence: env('FOLDER_CORRESPONDENCE', '1OrtMOwGMzzjwWktdxaPF_tvkxZaUfplc'),
  referrals: env('FOLDER_REFERRALS', '1s31v5RZtV8qC6YHXVpG3Ty8DrXVm_Usj'),
  ledgers: env('FOLDER_LEDGERS', '1wUPg0Mx5bdK4eoUwIP7Huq1QjILyuDiH'),
  manuals: env('FOLDER_MANUALS', '1xo3EtjWmGwlXbxFtmSDiiGHX8fXyw3xX'),
  archives: env('FOLDER_ARCHIVES', '1VPZSlDe2iojRUMigWa5cVlWw5wR4doPB')
};

const FOLDER_NAMES = {
  root: 'Ministry Archives', templates: 'Templates', petitions: 'Petitions & Civil Matters', inquiries: 'Inquiries & Adjudicator Records',
  licenses: 'Licenses & Permits', personnel: 'Personnel & Appointments', directives: 'Directives & Ministerial Orders', envoys: 'Envoys & Hold Affairs',
  register: 'Imperial Register', press: 'Press & Literature', heraldry: 'Heraldry & Noble Records', seals: 'Seals & Authentication',
  correspondence: 'Correspondence & Dispatch', referrals: 'Referrals & Records Requests', ledgers: 'Ledgers & Dockets', manuals: 'Manuals & Reference', archives: 'Archives'
};

module.exports = {
  PORT: Number(env('PORT', 3000)),
  BASE_URL: env('BASE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  SESSION_SECRET: env('SESSION_SECRET', 'dev-only-secret-change-me'),
  PRODUCTION: env('NODE_ENV', '') === 'production',
  DATA_DIR: env('DATA_DIR', path.join(__dirname, '..', 'data')),
  ADMIN_USERNAME: env('ADMIN_USERNAME', ''),
  ADMIN_PASSWORD: env('ADMIN_PASSWORD', ''),
  GOOGLE_CLIENT_ID: env('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: env('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_REFRESH_TOKEN: env('GOOGLE_REFRESH_TOKEN', ''),
  DOCKET_SHEET_ID: env('DOCKET_SHEET_ID', ''),
  MINISTER_NAME: env('MINISTER_NAME', 'Nimmi Silver'),
  CURRENT_YEAR: Number(env('CURRENT_YEAR', 226)),
  FOLDERS,
  FOLDER_NAMES
};
