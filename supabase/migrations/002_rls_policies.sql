-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin');

-- Specialties policies (read-only for most users)
CREATE POLICY "Everyone can view specialties"
  ON specialties FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage specialties"
  ON specialties FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Doctors policies
CREATE POLICY "Everyone can view active doctors"
  ON doctors FOR SELECT
  USING (active = true OR get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista'));

CREATE POLICY "Admins and recepcionistas can manage doctors"
  ON doctors FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'recepcionista'));

CREATE POLICY "Doctors can view their own record"
  ON doctors FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Doctors can update their own record"
  ON doctors FOR UPDATE
  USING (user_id = auth.uid());

-- Patients policies
CREATE POLICY "Patients can view their own record"
  ON patients FOR SELECT
  USING (user_id = auth.uid() OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro', 'recepcionista'));

CREATE POLICY "Patients can update their own record"
  ON patients FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Staff can manage patients"
  ON patients FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro', 'recepcionista'));

-- Insurance Plans policies
CREATE POLICY "Everyone can view active insurance plans"
  ON insurance_plans FOR SELECT
  USING (active = true OR get_user_role(auth.uid()) IN ('admin', 'recepcionista'));

CREATE POLICY "Admins can manage insurance plans"
  ON insurance_plans FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Procedures policies
CREATE POLICY "Everyone can view active procedures"
  ON procedures FOR SELECT
  USING (active = true OR get_user_role(auth.uid()) IN ('admin', 'recepcionista'));

CREATE POLICY "Admins can manage procedures"
  ON procedures FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Appointments policies
CREATE POLICY "Patients can view their own appointments"
  ON appointments FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro', 'recepcionista')
  );

CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

CREATE POLICY "Patients can update their own appointments"
  ON appointments FOR UPDATE
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'medico', 'recepcionista')
  );

CREATE POLICY "Doctors can view their appointments"
  ON appointments FOR SELECT
  USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

-- Medical Records policies
CREATE POLICY "Patients can view their own medical records"
  ON medical_records FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
  );

CREATE POLICY "Doctors can create medical records"
  ON medical_records FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'medico'));

CREATE POLICY "Doctors can update medical records"
  ON medical_records FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Anamnesis policies
CREATE POLICY "Authorized users can view anamnesis"
  ON anamnesis FOR SELECT
  USING (
    medical_record_id IN (
      SELECT id FROM medical_records 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
    )
  );

CREATE POLICY "Doctors can manage anamnesis"
  ON anamnesis FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Physical Exams policies
CREATE POLICY "Authorized users can view physical exams"
  ON physical_exams FOR SELECT
  USING (
    medical_record_id IN (
      SELECT id FROM medical_records 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
    )
  );

CREATE POLICY "Doctors can manage physical exams"
  ON physical_exams FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Evolutions policies
CREATE POLICY "Authorized users can view evolutions"
  ON evolutions FOR SELECT
  USING (
    medical_record_id IN (
      SELECT id FROM medical_records 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
    )
  );

CREATE POLICY "Doctors can manage evolutions"
  ON evolutions FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Medications policies (read-only drug database)
CREATE POLICY "Everyone can view medications"
  ON medications FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage medications"
  ON medications FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Prescriptions policies
CREATE POLICY "Patients can view their own prescriptions"
  ON prescriptions FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
  );

CREATE POLICY "Doctors can create prescriptions"
  ON prescriptions FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'medico'));

CREATE POLICY "Doctors can update prescriptions"
  ON prescriptions FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Prescription Items policies
CREATE POLICY "Authorized users can view prescription items"
  ON prescription_items FOR SELECT
  USING (
    prescription_id IN (
      SELECT id FROM prescriptions 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
    )
  );

CREATE POLICY "Doctors can manage prescription items"
  ON prescription_items FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Exams policies
CREATE POLICY "Patients can view their own exams"
  ON exams FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
  );

CREATE POLICY "Doctors can create exams"
  ON exams FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'medico'));

CREATE POLICY "Doctors can update exams"
  ON exams FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Exam Results policies
CREATE POLICY "Authorized users can view exam results"
  ON exam_results FOR SELECT
  USING (
    exam_id IN (
      SELECT id FROM exams 
      WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
      OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
    )
  );

CREATE POLICY "Doctors can manage exam results"
  ON exam_results FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico'));

-- Financial Transactions policies
CREATE POLICY "Patients can view their own transactions"
  ON financial_transactions FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

CREATE POLICY "Staff can manage transactions"
  ON financial_transactions FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'recepcionista'));

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Clinic Settings policies
CREATE POLICY "Everyone can view clinic settings"
  ON clinic_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage clinic settings"
  ON clinic_settings FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Audit Logs policies (read-only for admins)
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Waitlist policies
CREATE POLICY "Patients can view their own waitlist entries"
  ON waitlist FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

CREATE POLICY "Patients can create waitlist entries"
  ON waitlist FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'recepcionista')
  );

CREATE POLICY "Staff can manage waitlist"
  ON waitlist FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'recepcionista'));

-- Documents policies
CREATE POLICY "Patients can view their own documents"
  ON documents FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro')
  );

CREATE POLICY "Staff can manage documents"
  ON documents FOR ALL
  USING (get_user_role(auth.uid()) IN ('admin', 'medico', 'enfermeiro', 'recepcionista'));

