import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="mt-2 text-muted-foreground">
            We've sent you a verification link. Click the link in your email to
            activate your account.
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn't receive an email? Check your spam folder or{' '}
            <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
              try again
            </Link>
          </p>
          <Link
            href="/auth/signin"
            className="inline-block font-semibold text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
