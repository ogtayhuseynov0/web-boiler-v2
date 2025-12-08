"use client";

import React, { useEffect, useState, useRef, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, BookOpen, RefreshCw } from "lucide-react";
import { memoirApi, MemoirChapter, profileApi } from "@/lib/api-client";
import { toast } from "sonner";

interface PageProps {
  children: React.ReactNode;
  number?: number;
}

const Page = forwardRef<HTMLDivElement, PageProps>(({ children, number }, ref) => {
  return (
    <div ref={ref} className="page h-full w-full p-6 relative">
      <div className="overflow-hidden pb-8">{children}</div>
      {number !== undefined && (
        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-muted-foreground">
          {number}
        </div>
      )}
    </div>
  );
});

Page.displayName = "Page";

export default function MemoirPage() {
  const [chapters, setChapters] = useState<MemoirChapter[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [bookSize, setBookSize] = useState({ width: 550, height: 700 });
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate book size based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const availableHeight = container.clientHeight - 80;
        const availableWidth = container.clientWidth;

        const pageRatio = 0.7;

        let height = availableHeight;
        let width = height * pageRatio;

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
      const [chaptersRes, profileRes] = await Promise.all([
        memoirApi.getChapters(),
        profileApi.get(),
      ]);

      if (chaptersRes.data?.chapters) {
        setChapters(chaptersRes.data.chapters);
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

  const handleRegenerate = async () => {
    setRegenerating(true);
    const res = await memoirApi.regenerateAll();
    if (res.data?.success) {
      toast.success(`Regenerated ${res.data.regenerated} chapters`);
      // Refresh chapters
      const chaptersRes = await memoirApi.getChapters();
      if (chaptersRes.data?.chapters) {
        setChapters(chaptersRes.data.chapters);
      }
    } else {
      toast.error("Failed to regenerate chapters");
    }
    setRegenerating(false);
  };

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

  // Get chapters with content
  const chaptersWithContent = chapters.filter(c => c.current_content?.content);
  const totalMemories = chapters.reduce((sum, c) => sum + c.memory_count, 0);

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
          {totalMemories} memories across {chapters.length} chapters
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
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="flex justify-between items-center text-foreground"
            >
              <span className="font-serif">{chapter.title}</span>
              <span className="text-sm text-muted-foreground">
                {chapter.memory_count} {chapter.memory_count === 1 ? "story" : "stories"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );

  // Chapter pages with narratives - title and content on same page
  let pageNum = 2;
  chapters.forEach((chapter) => {
    if (chapter.current_content?.content) {
      const content = chapter.current_content.content.trim();

      // Split content into chunks for multiple pages
      const charsPerPage = 2700; // Characters per page (after first page with title)
      const firstPageChars = 2500; // Less chars on first page due to title
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

      const contentPages: string[] = [];
      let currentChunk = "";
      let isFirstPage = true;

      paragraphs.forEach((paragraph) => {
        const limit = isFirstPage ? firstPageChars : charsPerPage;
        if (currentChunk.length + paragraph.length > limit && currentChunk.length > 0) {
          contentPages.push(currentChunk.trim());
          currentChunk = paragraph + "\n\n";
          isFirstPage = false;
        } else {
          currentChunk += paragraph + "\n\n";
        }
      });
      if (currentChunk.trim()) {
        contentPages.push(currentChunk.trim());
      }

      // Render pages
      contentPages.forEach((pageContent, idx) => {
        const isFirst = idx === 0;
        pages.push(
          <Page key={`${chapter.id}-content-${idx}-${pageNum}`} number={pageNum++}>
            <div className="h-full overflow-hidden memoir-content">
              {/* Chapter header - only on first page */}
              {isFirst && (
                <div className="text-center mb-4">
                  <h2 className="text-xl font-serif font-bold text-foreground">
                    {chapter.title}
                  </h2>
                  {chapter.time_period_start && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {chapter.time_period_start}
                      {chapter.time_period_end && chapter.time_period_end !== chapter.time_period_start
                        ? ` - ${chapter.time_period_end}`
                        : ""}
                    </p>
                  )}
                  <div className="w-12 h-0.5 bg-primary/30 mx-auto mt-2" />
                </div>
              )}
              {/* Chapter content */}
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="text-foreground font-serif leading-relaxed mb-3 text-sm">
                      {children}
                    </p>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-foreground font-serif font-bold text-lg mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-foreground font-serif font-bold text-base mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-foreground font-serif font-semibold text-sm mb-1.5">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-foreground font-serif text-sm list-disc pl-4 mb-3 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="text-foreground font-serif text-sm list-decimal pl-4 mb-3 space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-foreground leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                }}
              >
                {pageContent}
              </ReactMarkdown>
            </div>
          </Page>
        );
      });
    } else if (chapter.memory_count === 0) {
      // Empty chapter - just title
      pages.push(
        <Page key={`${chapter.id}-empty`} number={pageNum++}>
          <div className="h-full flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-serif font-bold text-foreground mb-2">
              {chapter.title}
            </h2>
            <div className="w-12 h-0.5 bg-primary/30 mb-4" />
            <p className="text-muted-foreground font-serif italic">
              This chapter awaits your stories...
            </p>
          </div>
        </Page>
      );
    } else {
      // Has memories but no generated content yet
      pages.push(
        <Page key={`${chapter.id}-pending`} number={pageNum++}>
          <div className="h-full flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-serif font-bold text-foreground mb-2">
              {chapter.title}
            </h2>
            <div className="w-12 h-0.5 bg-primary/30 mb-4" />
            <p className="text-muted-foreground font-serif italic">
              {chapter.memory_count} {chapter.memory_count === 1 ? "story" : "stories"} captured
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap &quot;Regenerate&quot; to create this chapter&apos;s narrative
            </p>
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
      <div className="flex-shrink-0 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Memoir</h1>
          <p className="text-muted-foreground mt-1">
            Your life stories, beautifully preserved
          </p>
        </div>
        {totalMemories > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        )}
      </div>

      {/* Book Container */}
      <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
        {totalMemories === 0 ? (
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
