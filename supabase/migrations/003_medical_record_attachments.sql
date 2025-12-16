-- Medical Record Photos table (fotos antes e depois)
CREATE TABLE medical_record_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  taken_date DATE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Record Documents table (documentos vinculados ao prontuário)
CREATE TABLE medical_record_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_medical_record_photos_medical_record_id ON medical_record_photos(medical_record_id);
CREATE INDEX idx_medical_record_photos_type ON medical_record_photos(photo_type);
CREATE INDEX idx_medical_record_documents_medical_record_id ON medical_record_documents(medical_record_id);
CREATE INDEX idx_medical_record_documents_type ON medical_record_documents(document_type);

-- Enable RLS
ALTER TABLE medical_record_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_record_photos
CREATE POLICY "Authorized users can view medical record photos"
  ON medical_record_photos FOR SELECT
  USING (
    medical_record_id IN (
      SELECT id FROM medical_records 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
    )
  );

CREATE POLICY "Doctors can manage medical record photos"
  ON medical_record_photos FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- RLS Policies for medical_record_documents
CREATE POLICY "Authorized users can view medical record documents"
  ON medical_record_documents FOR SELECT
  USING (
    medical_record_id IN (
      SELECT id FROM medical_records 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
    )
  );

CREATE POLICY "Doctors can manage medical record documents"
  ON medical_record_documents FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

