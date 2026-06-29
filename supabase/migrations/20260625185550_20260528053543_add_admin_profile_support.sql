-- Allow admins to delete attendance records if needed
CREATE POLICY "Admins can delete attendance"
  ON attendance_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow public read of experiments (including inactive for admins via separate check)  
CREATE POLICY "Admins can view all experiments"
  ON experiments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );