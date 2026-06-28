import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Heading,
  List,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

const editorConfig = {
  licenseKey: 'GPL',
  plugins: [Essentials, Paragraph, Bold, Italic, Heading, List],
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'bulletedList',
    'numberedList',
    '|',
    'undo',
    'redo',
  ],
};

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Enter details...',
  disabled = false,
}) => {
  return (
    <div className="rich-text-editor">
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        disabled={disabled}
        config={{
          ...editorConfig,
          placeholder,
        }}
        onChange={(event, editor) => {
          onChange(editor.getData());
        }}
      />
    </div>
  );
};

export default RichTextEditor;