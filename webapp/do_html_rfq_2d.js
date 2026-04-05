import fs from 'fs';
import path from 'path';

const htmlPath = path.join(process.cwd(), 'app.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const replacement = `
                    <div class="rfq-upload-col">
                      <!-- 3D Files Dropzone -->
                      <div class="rfq-engine__upload-zone" id="rfq-upload-zone-0" style="min-height: 220px;">
                        <input type="file" class="rfq-file-input" data-part="0" multiple
                          accept=".step,.stp,.stl,.obj,.3mf,.iges,.igs,.dxf,.sldprt,.ipt,.x_t,.x_b,.3dxml,.catpart,.prt,.sat,.jt"
                          hidden />
                        <div class="upload-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <div class="upload-text">
                          <h3>Drag & Drop 3D CAD Files</h3>
                          <p style="margin-top: 4px;">Upload at least 1 3D CAD file to get started.</p>
                        </div>
                        <button class="upload-btn rfq-select-files-btn" data-part="0">Select 3D Files</button>
                        <div class="upload-file-list hidden" data-part="0"></div>
                        <div class="upload-formats">
                          <p>STEP · STP · SLDPRT · STL · DXF · IPT · X_T · 3DXML · CATPART · PRT · SAT · 3MF · JT</p>
                        </div>
                      </div>

                      <!-- 2D / Supporting Docs Dropzone -->
                      <div class="rfq-engine__upload-zone" id="rfq-upload-zone-2d-0" style="min-height: 140px; margin-top: 12px; background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.08);">
                        <input type="file" class="rfq-file-input-2d" data-part="0" multiple
                          accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.doc,.docx"
                          hidden />
                        <div class="upload-icon" style="color: var(--color-steel-400); margin-bottom: -6px;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                        </div>
                        <div class="upload-text">
                          <h3 style="font-size: 12px; color: var(--color-steel-300);">2D Drawings & Supporting Docs</h3>
                          <p style="font-size: 10px; margin-top: 2px;">Drag & Drop or <span class="upload-link">Choose Files</span></p>
                        </div>
                        <div class="upload-file-list hidden" id="upload-file-list-2d-0"></div>
                        <div class="upload-formats" style="margin-top: 4px;">
                          <p>PDF · DWG · DXF · PNG · JPG</p>
                        </div>
                      </div>

                      <!-- DFM Toggle -->
`;

const regex = /<div class="rfq-upload-col">[\s\S]*?<!-- DFM Toggle -->/;
html = html.replace(regex, replacement);

fs.writeFileSync(htmlPath, html);
console.log('Done replacing app html');
