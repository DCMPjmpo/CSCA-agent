const fs = require('fs');
const f = 'lib/i18n/translations.ts';
let c = fs.readFileSync(f, 'utf-8').replace(/\r\n/g, '\n');

// Find and fix all "  },\n  },\n  common:" patterns (double closing)
c = c.replace(/\n  },\n  },\n  common:/g, '\n  },\n  common:');

// Also check for "  },\n  },\n  diagnosis:" patterns in case the next section is different
c = c.replace(/\n  },\n  },\n  /g, '\n  },\n  ');

// Clean up any remaining "  },\n  }" at end of blocks
c = c.replace(/\n  },\n  }(,)?\n  scoreAnalysis/g, '\n  },\n  scoreAnalysis');
c = c.replace(/\n  },\n  }(,)?\n  universityMatch/g, '\n  },\n  universityMatch');
c = c.replace(/\n  },\n  }(,)?\n  steps/g, '\n  },\n  steps');

fs.writeFileSync(f, c, 'utf-8');
console.log('Fixed double braces');
