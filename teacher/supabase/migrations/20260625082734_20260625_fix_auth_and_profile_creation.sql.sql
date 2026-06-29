-- Fix profile creation for new users
-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, student_id, class_name)
  VALUES (
    NEW.id,
    'student',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'student_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'class_name', '')
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update the insert policy to also allow service role
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow insert if the user is authenticated and inserting their own profile
-- OR if it's being inserted by the trigger (which runs as SECURITY DEFINER)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also allow unauthenticated inserts for the trigger case (covered by SECURITY DEFINER)
-- We need to enable anonymous inserts since the trigger runs as superuser

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.experiments TO authenticated;
GRANT ALL ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.experiment_results TO authenticated;
GRANT ALL ON public.ai_interactions TO authenticated;

-- Enable unauthenticated role access for signup flow
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON public.profiles TO anon;