const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const clearBtn = document.getElementById('clearBtn');
const message = document.getElementById('message');
const previewSection = document.getElementById('previewSection');
const pdfFrame = document.getElementById('pdfFrame');
const downloadLink = document.getElementById('downloadLink');
const closePreview = document.getElementById('closePreview');

let files = [];

function updateUI() {
  fileList.innerHTML = '';
  files.forEach((f, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-left">
        <div class="file-name">${f.name}</div>
        <div class="file-size" style="color:var(--muted);font-size:13px;margin-left:8px">${(f.size/1024).toFixed(1)} KB</div>
      </div>
      <div class="file-controls">
        <button class="btn" onclick="moveUp(${idx})">↑</button>
        <button class="btn" onclick="moveDown(${idx})">↓</button>
        <button class="btn" onclick="removeFile(${idx})">✕</button>
      </div>
    `;
    fileList.appendChild(item);
  });
  mergeBtn.disabled = files.length < 2;
  message.textContent = files.length < 2 ? 'Please add at least two PDF files to enable merging.' : '';
}

function moveUp(i){ if(i<=0) return; [files[i-1],files[i]]=[files[i],files[i-1]]; updateUI(); }
function moveDown(i){ if(i>=files.length-1) return; [files[i+1],files[i]]=[files[i],files[i+1]]; updateUI(); }
function removeFile(i){ files.splice(i,1); updateUI(); }

fileInput.addEventListener('change', (e)=>{
  const chosen = Array.from(e.target.files).filter(f=>f.type==='application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  files = files.concat(chosen);
  updateUI();
  fileInput.value = '';
});

clearBtn.addEventListener('click', ()=>{ files = []; updateUI(); previewSection.hidden = true; pdfFrame.src = ''; });

mergeBtn.addEventListener('click', async ()=>{
  if(files.length < 2){ message.textContent = 'Need at least two PDFs.'; return; }
  message.textContent = 'Merging...';
  mergeBtn.disabled = true;
  try{
    const fd = new FormData();
    files.forEach(f=>fd.append('pdfs', f, f.name));
    const resp = await fetch('/merge', { method: 'POST', body: fd });
    if(!resp.ok){
      const err = await resp.json().catch(()=>({error:'Server error'}));
      message.textContent = err.error || 'Merge failed';
      mergeBtn.disabled = false;
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    pdfFrame.src = url;
    downloadLink.href = url;
    previewSection.hidden = false;
    message.textContent = 'Merge complete — preview below. Use Download to save.';
  }catch(err){
    console.error(err);
    message.textContent = 'Network or server error while merging.';
  }finally{
    mergeBtn.disabled = false;
  }
});

closePreview.addEventListener('click', ()=>{ previewSection.hidden = true; pdfFrame.src=''; });

// drag & drop support
const dropArea = document.querySelector('.drop-area');
['dragenter','dragover'].forEach(evt=>{
  dropArea.addEventListener(evt, e=>{ e.preventDefault(); e.stopPropagation(); dropArea.style.opacity = '0.9'; });
});
['dragleave','drop'].forEach(evt=>{
  dropArea.addEventListener(evt, e=>{ e.preventDefault(); e.stopPropagation(); dropArea.style.opacity = ''; });
});
dropArea.addEventListener('drop', e=>{
  const dt = e.dataTransfer;
  const dropped = Array.from(dt.files).filter(f=>f.type==='application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  files = files.concat(dropped);
  updateUI();
});
