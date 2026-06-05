import { LoginForm } from "@/components/auth/login-form"
import { Building2 } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-zinc-900/50" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url("/abstract-geometric-shapes.png")',
            backgroundSize: "cover",
          }}
        />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Building2 className="mr-2 h-6 w-6 text-primary" />
          LiftOps
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "The most reliable management system for vertical transportation infrastructure. Built for speed, safety,
              and precision."
            </p>
            <footer className="text-sm text-zinc-400">Operations Control Center</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center lg:hidden">
            <Building2 className="mx-auto h-10 w-10 text-primary mb-2" />
            <h1 className="text-2xl font-semibold tracking-tight">LiftOps</h1>
          </div>
          <LoginForm />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
