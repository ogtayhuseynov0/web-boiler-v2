"use client";

import React, { useEffect, useState, useRef, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { memoriesApi, Memory, profileApi } from "@/lib/api-client";

interface PageProps {
  children: React.ReactNode;
  number?: number;
}

const Page = forwardRef<HTMLDivElement, PageProps>(({ children, number }, ref) => {
  return (
    <div ref={ref} className="page h-full w-full p-8 flex flex-col">
      <div className="flex-1 overflow-hidden">{children}</div>
      {number !== undefined && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          {number}
        </div>
      )}
    </div>
  );
});

Page.displayName = "Page";

function groupMemoriesByCategory(memories: Memory[]) {
  const groups: Record<string, Memory[]> = {};
  memories.forEach((m) => {
    if (!groups[m.category]) {
      groups[m.category] = [];
    }
    groups[m.category].push(m);
  });
  return groups;
}

const categoryTitles: Record<string, string> = {
  relationship: "Family & Relationships",
  fact: "Life Facts",
  preference: "Preferences & Values",
  reminder: "Important Dates",
  task: "Goals & Aspirations",
  other: "Other Memories",
};

export default function MemoirPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [bookSize, setBookSize] = useState({ width: 550, height: 700 });
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate book size based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const availableHeight = container.clientHeight - 80; // Leave room for nav
        const availableWidth = container.clientWidth;

        // Book aspect ratio ~0.7 (width/height for open book is ~1.4)
        const pageRatio = 0.7;

        let height = availableHeight;
        let width = height * pageRatio;

        // If width is too large, constrain by width
        if (width * 2 > availableWidth - 40) {
          width = (availableWidth - 40) / 2;
          height = width / pageRatio;
        }

        setBookSize({
          width: Math.floor(Math.max(300, width)),
          height: Math.floor(Math.max(400, height))
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [loading]);

  useEffect(() => {
    const fetchData = async () => {
      const [memoriesRes, profileRes] = await Promise.all([
        memoriesApi.list({ limit: 100 }),
        profileApi.get(),
      ]);

      if (memoriesRes.data?.memories) {
        setMemories(memoriesRes.data.memories);
      }
      if (profileRes.data) {
        setUserName(
          profileRes.data.preferred_name ||
            profileRes.data.full_name ||
            "Your"
        );
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const groupedMemories = groupMemoriesByCategory(memories);
  const categories = Object.keys(groupedMemories);

  const handlePrevPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const handleNextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  const onFlip = (e: any) => {
    setCurrentPage(e.data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Build pages content
  const pages: React.ReactNode[] = [];

  // Cover page
  pages.push(
    <Page key="cover">
      <div className="h-full flex flex-col items-center justify-center text-center">
        <BookOpen className="h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          {userName}&apos;s Memoir
        </h1>
        <p className="text-muted-foreground font-serif italic">
          A Collection of Life Stories
        </p>
        <div className="mt-8 w-24 h-0.5 bg-primary/30" />
        <p className="mt-4 text-sm text-muted-foreground">
          {memories.length} memories captured
        </p>
      </div>
    </Page>
  );

  // Table of contents
  pages.push(
    <Page key="toc" number={1}>
      <div className="h-full">
        <h2 className="text-xl font-serif font-bold text-foreground mb-6 text-center">
          Contents
        </h2>
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div
              key={cat}
              className="flex justify-between items-center text-foreground"
            >
              <span className="font-serif">
                {categoryTitles[cat] || cat}
              </span>
              <span className="text-sm text-muted-foreground">
                {groupedMemories[cat].length} stories
              </span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );

  // Category pages with memories
  let pageNum = 2;
  categories.forEach((category) => {
    const categoryMemories = groupedMemories[category];

    // Category title page
    pages.push(
      <Page key={`${category}-title`} number={pageNum++}>
        <div className="h-full flex flex-col items-center justify-center text-center">
          <div className="w-16 h-0.5 bg-primary/30 mb-4" />
          <h2 className="text-2xl font-serif font-bold text-foreground">
            {categoryTitles[category] || category}
          </h2>
          <div className="w-16 h-0.5 bg-primary/30 mt-4" />
          <p className="mt-6 text-muted-foreground text-sm">
            {categoryMemories.length} memories
          </p>
        </div>
      </Page>
    );

    // Memory pages (4 memories per page)
    const memoriesPerPage = 4;
    for (let i = 0; i < categoryMemories.length; i += memoriesPerPage) {
      const pageMemories = categoryMemories.slice(i, i + memoriesPerPage);
      pages.push(
        <Page key={`${category}-${i}`} number={pageNum++}>
          <div className="space-y-4">
            {pageMemories.map((memory) => (
              <div
                key={memory.id}
                className="pb-4 border-b border-border last:border-0"
              >
                <p className="text-foreground font-serif leading-relaxed">
                  {memory.content}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(memory.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </Page>
      );
    }
  });

  // End page
  pages.push(
    <Page key="end">
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-0.5 bg-primary/30 mb-6" />
        <p className="text-foreground font-serif italic text-lg">
          To be continued...
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Keep sharing your stories to grow your memoir
        </p>
        <div className="w-16 h-0.5 bg-primary/30 mt-6" />
      </div>
    </Page>
  );

  // Ensure even number of pages for proper book layout
  if (pages.length % 2 !== 0) {
    pages.push(<Page key="blank"><div /></Page>);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold">Your Memoir</h1>
        <p className="text-muted-foreground mt-1">
          Your life stories, beautifully preserved
        </p>
      </div>

      {/* Book Container */}
      <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
        {memories.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Your memoir is empty</h3>
            <p className="text-muted-foreground mt-2">
              Start a conversation to begin capturing your stories
            </p>
          </Card>
        ) : (
          <>
            <div className="book-container flex-1 w-full flex items-center justify-center">
              {/* @ts-ignore - react-pageflip types are incomplete */}
              <HTMLFlipBook
                key={`${bookSize.width}-${bookSize.height}`}
                ref={bookRef}
                width={bookSize.width}
                height={bookSize.height}
                showCover={true}
                flippingTime={800}
                usePortrait={false}
                maxShadowOpacity={0.5}
                mobileScrollSupport={true}
                onFlip={onFlip}
                className="book-shadow"
                style={{}}
                startPage={0}
                drawShadow={true}
                useMouseEvents={true}
                swipeDistance={30}
                clickEventForward={false}
                showPageCorners={true}
                disableFlipByClick={false}
              >
                {pages}
              </HTMLFlipBook>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-4 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[100px] text-center">
                Page {currentPage + 1} of {pages.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage >= pages.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .book-container {
          perspective: 3000px;
        }
        .book-shadow {
          box-shadow: 0 20px 60px rgba(60, 40, 20, 0.3);
        }
        .stf__wrapper {
          box-shadow: 0 0 30px rgba(60, 40, 20, 0.25);
        }
        .page {
          background: oklch(0.95 0.02 75);
          box-shadow: inset 0 0 30px rgba(60, 40, 20, 0.06);
        }
        .dark .page {
          background: oklch(0.18 0.025 55);
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.15);
        }
        .dark .book-shadow {
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .dark .stf__wrapper {
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
