import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    login(phone, name);
    toast.success("Logged in successfully");
    setLocation("/");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-4 py-12 max-w-md mx-auto">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-primary mx-auto rounded-3xl neu-card flex items-center justify-center text-primary-foreground font-bold text-4xl mb-6">
          S
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome to SwiftMart</h1>
        <p className="text-muted-foreground">India's fastest delivery app</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card p-6 md:p-8 rounded-[2rem] neu-card space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <div className="bg-background neu-inset flex items-center justify-center px-4 rounded-xl font-medium text-muted-foreground border-none">
                +91
              </div>
              <Input 
                id="phone"
                type="tel"
                maxLength={10}
                placeholder="Enter mobile number" 
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="bg-background neu-inset border-none h-12 rounded-xl text-lg flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name"
              placeholder="Enter your name" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-background neu-inset border-none h-12 rounded-xl text-lg"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full rounded-2xl h-14 text-lg font-bold shadow-none neu-card"
        >
          Continue
        </Button>

        <p className="text-center text-xs text-muted-foreground leading-relaxed px-4">
          By continuing, you agree to our Terms of Service & Privacy Policy
        </p>
      </form>
    </div>
  );
}
