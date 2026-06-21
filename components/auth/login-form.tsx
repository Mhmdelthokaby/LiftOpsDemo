"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { loginSchema, type LoginFormData, loginAdmin, saveAuthDocs } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "admin@liftops.com",
            password: "123456",
        },
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            const result = await loginAdmin(data)
            saveAuthDocs(result)

            const getRedirectPath = (roles: string[]) => {
                // Manager can access everything, redirect to dashboard
                if (roles.includes("Manager")) return "/"
                // If user has multiple roles, prioritize by role hierarchy
                if (roles.includes("InstallationAdmin")) return "/installation"
                if (roles.includes("MaintenanceAdmin")) return "/maintenance?view=projects"
                if (roles.includes("InventoryAdmin")) return "/inventory"
                if (roles.includes("FinanceAdmin")) return "/finance"
                if (roles.includes("FaultsAdmin")) return "/emergency"
                return "/"
            }

            const redirectPath = getRedirectPath(result.roles)
            
            toast({
                title: "Login Successful",
                description: `Welcome back! Redirecting...`,
            })

            router.push(redirectPath)
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: error instanceof Error ? error.message : "An unexpected error occurred",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center hidden lg:block">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Sign in to your account
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email and password to access the admin panel
                </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        {...register("email")}
                        disabled={isLoading}
                        autoComplete="email"
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive font-medium">
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {/* <a
                            href="#"
                            className="text-sm font-medium text-primary hover:underline underline-offset-4"
                        >
                            Forgot password?
                        </a> */}
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...register("password")}
                            disabled={isLoading}
                            autoComplete="current-password"
                            className="pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="sr-only">
                                {showPassword ? "Hide password" : "Show password"}
                            </span>
                        </Button>
                    </div>
                    {errors.password && (
                        <p className="text-sm text-destructive font-medium">
                            {errors.password.message}
                        </p>
                    )}
                </div>
                <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                </Button>
            </form>
        </div>
    )
}

