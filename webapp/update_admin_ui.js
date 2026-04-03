import fs from 'fs';

const adminPath = 'src/js/admin.js';
let content = fs.readFileSync(adminPath, 'utf8');

// Replace standard segment output with styled tags
// Example from previous logic:
// <td>${s.segment || '—'}</td>
// <td>${s.techGroup || '—'}</td>

const segmentRegex = /<td>\$\{s\.segment \|\| '—'\}<\/td>\s*<td>\$\{s\.techGroup \|\| '—'\}<\/td>/g;
const customOutput = `<td>
          <span class="tag-segment \${s.segment === 'TIER 1' ? 'tag-tier1' : s.segment === 'TIER 2' ? 'tag-tier2' : s.segment === 'OEM' ? 'tag-oem' : ''}">
            \${s.segment || '—'}
          </span>
        </td>
        <td>
          <span class="tag-tech-group">
            \${s.techGroup || '—'}
          </span>
        </td>`;
content = content.replace(segmentRegex, customOutput);

// Add custom instant tooltip for specific technologies
// Instead of:
// <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(s.technologies || []).join(', ')}">${(s.technologies || []).slice(0,2).join(', ') || '—'}</td>
const tooltipRegexTech = /<td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\$\{\(s\.technologies \|\| \[\]\)\.join\(\', '\)\}">\$\{\(s\.technologies \|\| \[\]\)\.slice\(0,2\)\.join\(\', '\) \|\| '—'\}<\/td>/g;
const newTooltipTech = `<td class="admin-tooltip-container">
          <span class="admin-tooltip-label">\${(s.technologies || []).slice(0,2).join(', ') || '—'}</span>
          \${(s.technologies || []).length > 0 ? \`<div class="admin-tooltip-box">\${(s.technologies || []).join(', ')}</div>\` : ''}
        </td>`;
content = content.replace(tooltipRegexTech, newTooltipTech);

// Do the same for certifications if we want, or leave as is. User only specified technologies.
// "when i hover over the Specifc Techs in the admin crm..."

// Replace <td class="admin-table-actions">...</td> with <td><div class="admin-table-actions-wrapper">...</div></td>
// Wait, the match is across multiple lines. Let's use a regex.
const actionsRegex = /<td class="admin-table-actions">([\s\S]*?)<\/td>/g;
content = content.replace(actionsRegex, '<td class="admin-table-actions"><div class="admin-table-actions-wrapper">$1</div></td>');

fs.writeFileSync(adminPath, content, 'utf8');
console.log('UI updates applied to admin.js');
