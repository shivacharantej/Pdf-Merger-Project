from flask import Flask, render_template, request, send_file, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename
import tempfile, os
from pypdf import PdfReader, PdfWriter

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf'}

app = Flask(__name__)
app.config['SECRET_KEY'] = 'change-this-secret'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200 MB limit total

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/merge', methods=['POST'])
def merge():
    if 'pdfs' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    files = request.files.getlist('pdfs')
    pdf_paths = []

    # Save uploaded files to temp
    for f in files:
        if f and allowed_file(f.filename):
            filename = secure_filename(f.filename)
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"pdfmerge_{next(tempfile._get_candidate_names())}_{filename}")
            f.save(save_path)
            pdf_paths.append(save_path)

    if len(pdf_paths) < 2:
        # cleanup
        for p in pdf_paths:
            try: os.remove(p)
            except: pass
        return jsonify({'error': 'Please upload at least two PDF files to merge.'}), 400

    # Merge using PdfReader + PdfWriter for compatibility
    writer = PdfWriter()
    try:
        for path in pdf_paths:
            reader = PdfReader(path)
            for page in reader.pages:
                writer.add_page(page)
        output_fd, output_path = tempfile.mkstemp(suffix='.pdf', prefix='merged_')
        os.close(output_fd)
        with open(output_path, 'wb') as f_out:
            writer.write(f_out)
    except Exception as e:
        # cleanup
        for p in pdf_paths:
            try: os.remove(p)
            except: pass
        return jsonify({'error': f'Error merging PDFs: {e}'}), 500
    finally:
        # remove uploaded temp files
        for p in pdf_paths:
            try: os.remove(p)
            except: pass

    # Return the merged PDF for inline preview (Content-Type: application/pdf)
    return send_file(output_path, mimetype='application/pdf', download_name='merged.pdf', as_attachment=False)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
