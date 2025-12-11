"use client";

import React, { useState, useRef, useEffect, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  time_period_start: string | null;
  time_period_end: string | null;
  stories: Array<{
    id: string;
    title: string | null;
    content: string;
    time_period: string | null;
  }>;
}

interface PublicMemoirBookProps {
  ownerName: string;
  memoirTitle: string | null;
  chapters: Chapter[];
}

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

export function PublicMemoirBook({ ownerName, memoirTitle, chapters }: PublicMemoirBookProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [targetPage, setTargetPage] = useState(0);
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
  }, []);

  const handlePrevPage = () => {
    if (bookRef.current) {
      setTargetPage(prev => Math.max(0, prev - 1));
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const handleNextPage = () => {
    if (bookRef.current) {
      setTargetPage(prev => prev + 1);
      bookRef.current.pageFlip().flipNext();
    }
  };

  const onFlip = (e: any) => {
    setCurrentPage(e.data);
    setTargetPage(e.data);
  };

  const onChangeState = (e: any) => {
    if (e.data === 'read') {
      const pageFlip = bookRef.current?.pageFlip();
      if (pageFlip) {
        const actualPage = pageFlip.getCurrentPageIndex();
        setTargetPage(prev => prev !== actualPage ? actualPage : prev);
      }
    }
  };

  const handleBookClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const midPoint = rect.width / 2;

    if (clickX < midPoint && currentPage > 0) {
      setTargetPage(currentPage - 1);
    } else if (clickX >= midPoint) {
      setTargetPage(currentPage + 1);
    }
  };

  const chaptersWithStories = chapters.filter(c => c.stories && c.stories.length > 0);
  const totalStories = chapters.reduce((sum, c) => sum + (c.stories?.length || 0), 0);

  // Build pages content
  const pages: React.ReactNode[] = [];

  // Cover page
  pages.push(
    <Page key="cover">
      <div className="h-full flex flex-col items-center justify-center text-center">
        <BookOpen className="h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
          {memoirTitle || `${ownerName}'s Memoir`}
        </h1>
        <p className="text-muted-foreground font-serif italic">
          A Collection of Life Stories
        </p>
        <div className="mt-8 w-24 h-0.5 bg-primary/30" />
        <p className="mt-4 text-sm text-muted-foreground">
          {totalStories} stories across {chaptersWithStories.length} chapters
        </p>
      </div>
    </Page>
  );

  // Table of contents
  if (chaptersWithStories.length > 0) {
    pages.push(
      <Page key="toc" number={1}>
        <div className="h-full">
          <h2 className="text-xl font-serif font-bold text-foreground mb-6 text-center">
            Contents
          </h2>
          <div className="space-y-3">
            {chaptersWithStories.map((chapter) => (
              <div
                key={chapter.id}
                className="flex justify-between items-center text-foreground"
              >
                <span className="font-serif">{chapter.title}</span>
                <span className="text-sm text-muted-foreground">
                  {chapter.stories.length} {chapter.stories.length === 1 ? "story" : "stories"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Page>
    );
  }

  // Chapter pages with stories
  let pageNum = 2;
  chaptersWithStories.forEach((chapter) => {
    const allContent = chapter.stories.map((story) => {
      let storyText = "";
      if (story.title) {
        storyText += `### ${story.title}\n\n`;
      }
      storyText += story.content;
      return storyText;
    }).join("\n\n---\n\n");

    const charsPerPage = 2700;
    const firstPageChars = 2500;
    const paragraphs = allContent.split(/\n\n+/).filter(p => p.trim());

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

    contentPages.forEach((pageContent, idx) => {
      const isFirst = idx === 0;
      pages.push(
        <Page key={`${chapter.id}-content-${idx}-${pageNum}`} number={pageNum++}>
          <div className="h-full overflow-hidden memoir-content">
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
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="text-foreground font-serif leading-relaxed mb-3 text-sm">
                    {children}
                  </p>
                ),
                h3: ({ children }) => (
                  <h3 className="text-foreground font-serif font-semibold text-base mb-2 mt-4">{children}</h3>
                ),
                hr: () => (
                  <div className="my-4 flex justify-center">
                    <div className="w-16 h-0.5 bg-primary/20" />
                  </div>
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
  });

  // End page
  pages.push(
    <Page key="end">
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-0.5 bg-primary/30 mb-6" />
        <p className="text-foreground font-serif italic text-lg">
          The End
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you for reading
        </p>
        <div className="w-16 h-0.5 bg-primary/30 mt-6" />
      </div>
    </Page>
  );

  // Add blank page before end if needed
  const middlePageCount = pages.length - 2;
  if (middlePageCount % 2 !== 0) {
    pages.splice(pages.length - 1, 0, <Page key="blank"><div /></Page>);
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
      <div
        className={`book-container flex-1 w-full flex items-center justify-center ${
          targetPage === 0 ? 'cover-page-view' : targetPage >= pages.length - 1 ? 'back-page-view' : ''
        }`}
        onClick={handleBookClick}
      >
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
          onChangeState={onChangeState}
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

      <style jsx global>{`
        .book-container {
          perspective: 3000px;
        }
        .book-shadow {
          box-shadow: 0 20px 60px rgba(60, 40, 20, 0.3);
        }
        .stf__wrapper {
          box-shadow: 0 0 30px rgba(60, 40, 20, 0.25);
          transition: transform 0.5s ease;
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
        .cover-page-view .stf__wrapper {
          transform: translateX(-25%) !important;
        }
        .back-page-view .stf__wrapper {
          transform: translateX(25%) !important;
        }
        .cover-page-view .stf__parent,
        .back-page-view .stf__parent,
        .cover-page-view .stf__wrapper,
        .back-page-view .stf__wrapper,
        .cover-page-view .book-shadow,
        .back-page-view .book-shadow {
          box-shadow: none !important;
        }
        .cover-page-view .stf__wrapper .stf__item:last-child,
        .back-page-view .stf__wrapper .stf__item:first-child {
          box-shadow: 0 20px 60px rgba(60, 40, 20, 0.3), 0 0 30px rgba(60, 40, 20, 0.25);
        }
        .dark .cover-page-view .stf__wrapper .stf__item:last-child,
        .dark .back-page-view .stf__wrapper .stf__item:first-child {
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
