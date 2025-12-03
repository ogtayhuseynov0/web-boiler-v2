"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Search, Trash2, Filter } from "lucide-react";

const categories = [
  { value: "all", label: "All" },
  { value: "preference", label: "Preferences" },
  { value: "fact", label: "Facts" },
  { value: "task", label: "Tasks" },
  { value: "reminder", label: "Reminders" },
  { value: "relationship", label: "Relationships" },
];

export default function MemoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Memories</h1>
        <p className="text-muted-foreground">
          Information the AI has learned about you from conversations
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Memories</CardTitle>
          <CardDescription>
            These are facts and preferences the AI remembers about you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No memories yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              As you have conversations, the AI will learn and remember important
              information about you. You can view and manage those memories here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
