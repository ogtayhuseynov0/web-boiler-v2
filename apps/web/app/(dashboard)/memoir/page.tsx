"use client";

import { useEffect, useState, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { memoriesApi, Memory, profileApi } from "@/lib/api-client";

interface PageProps {
  children: React.ReactNode;
  number?: number;
}

const Page = ({ children, number }: PageProps) => {
  return (
    <div className="page bg-amber-50 dark:bg-amber-950/30 h-full w-full p-8 flex flex-col shadow-lg">
      <div className="flex-1 overflow-hidden">{children}</div>
      {number !== undefined && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          {number}
        </div>
      )}
    </div>
  );
};

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
  const bookRef = useRef<any>(null);

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
        <BookOpen className="h-16 w-16 text-amber-700 dark:text-amber-500 mb-6" />
        <h1 className="text-3xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-2">
          {userName}&apos;s Memoir
        </h1>
        <p className="text-amber-700 dark:text-amber-400 font-serif italic">
          A Collection of Life Stories
        </p>
        <div className="mt-8 w-24 h-0.5 bg-amber-300 dark:bg-amber-700" />
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-500">
          {memories.length} memories captured
        </p>
      </div>
    </Page>
  );

  // Table of contents
  pages.push(
    <Page key="toc" number={1}>
      <div className="h-full">
        <h2 className="text-xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-6 text-center">
          Contents
        </h2>
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div
              key={cat}
              className="flex justify-between items-center text-amber-800 dark:text-amber-200"
            >
              <span className="font-serif">
                {categoryTitles[cat] || cat}
              </span>
              <span className="text-sm text-amber-600 dark:text-amber-500">
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
          <div className="w-16 h-0.5 bg-amber-300 dark:bg-amber-700 mb-4" />
          <h2 className="text-2xl font-serif font-bold text-amber-900 dark:text-amber-100">
            {categoryTitles[category] || category}
          </h2>
          <div className="w-16 h-0.5 bg-amber-300 dark:bg-amber-700 mt-4" />
          <p className="mt-6 text-amber-600 dark:text-amber-500 text-sm">
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
                className="pb-4 border-b border-amber-200 dark:border-amber-800 last:border-0"
              >
                <p className="text-amber-900 dark:text-amber-100 font-serif leading-relaxed">
                  {memory.content}
                </p>
                <p className="text-xs text-amber-500 dark:text-amber-600 mt-1">
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
        <div className="w-16 h-0.5 bg-amber-300 dark:bg-amber-700 mb-6" />
        <p className="text-amber-700 dark:text-amber-400 font-serif italic text-lg">
          To be continued...
        </p>
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-500">
          Keep sharing your stories to grow your memoir
        </p>
        <div className="w-16 h-0.5 bg-amber-300 dark:bg-amber-700 mt-6" />
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
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
            <div className="book-container relative">
              {/* @ts-ignore - react-pageflip types are incomplete */}
              <HTMLFlipBook
                ref={bookRef}
                width={350}
                height={500}
                size="stretch"
                minWidth={280}
                maxWidth={400}
                minHeight={400}
                maxHeight={550}
                showCover={true}
                flippingTime={600}
                usePortrait={true}
                startZIndex={0}
                autoSize={true}
                maxShadowOpacity={0.3}
                mobileScrollSupport={true}
                onFlip={onFlip}
                className="book"
                style={{}}
                startPage={0}
                drawShadow={true}
                useMouseEvents={true}
                swipeDistance={30}
                clickEventForward={true}
                showPageCorners={true}
                disableFlipByClick={false}
              >
                {pages}
              </HTMLFlipBook>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-6">
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
          perspective: 2000px;
        }
        .book {
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        .page {
          background: linear-gradient(
            to right,
            #fef3c7 0%,
            #fffbeb 50%,
            #fef3c7 100%
          );
          border-radius: 0 8px 8px 0;
        }
        .dark .page {
          background: linear-gradient(
            to right,
            #292524 0%,
            #1c1917 50%,
            #292524 100%
          );
        }
      `}</style>
    </div>
  );
}
