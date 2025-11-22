/**
 * Slug and Search Utilities for Week 7
 * 
 * Provides functions for:
 * - Generating URL-friendly slugs
 * - Creating search terms for full-text search
 * - Building GSI3 keys for location-based queries
 */

/**
 * Generate a URL-friendly slug from event title and date
 * 
 * @param title - Event title
 * @param startDateTime - Event start date (ISO string)
 * @returns URL-safe slug
 * 
 * @example
 * generateSlug("Tech Talk: AWS Serverless", "2025-10-15T18:00:00Z")
 * // Returns: "tech-talk-aws-serverless-oct-2025"
 */
export function generateSlug(title: string, startDateTime: string): string {
  // Extract month and year from date
  const date = new Date(startDateTime);
  const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
  const year = date.getFullYear();
  
  // Normalize title: lowercase, remove special chars, replace spaces with hyphens
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Trim hyphens from start/end
  
  return `${normalizedTitle}-${month}-${year}`;
}

/**
 * Generate shareable URL for an event
 * 
 * @param slug - Event slug
 * @param baseUrl - Base URL (default: process.env.FRONTEND_URL)
 * @returns Full shareable URL
 * 
 * @example
 * generateShareableUrl("tech-talk-aws-serverless-oct-2025")
 * // Returns: "https://events.umd.edu/events/tech-talk-aws-serverless-oct-2025"
 */
export function generateShareableUrl(
  slug: string, 
  baseUrl?: string
): string {
  const base = baseUrl || process.env.FRONTEND_URL || 'https://events.umd.edu';
  return `${base}/events/${slug}`;
}

/**
 * Generate search terms by concatenating searchable event fields
 * This enables full-text search across multiple fields
 * 
 * @param event - Event object with searchable fields
 * @returns Space-separated search terms
 * 
 * @example
 * generateSearchTerms({
 *   title: "Tech Talk",
 *   description: "Learn about AWS Serverless",
 *   location: { name: "Iribe Center", building: "Iribe" },
 *   tags: ["aws", "serverless"]
 * })
 * // Returns: "tech talk learn about aws serverless iribe center iribe aws serverless"
 */
export function generateSearchTerms(event: {
  title: string;
  description: string;
  location: { name: string; building: string; room?: string };
  tags: string[];
}): string {
  const terms: string[] = [
    event.title,
    event.description,
    event.location.name,
    event.location.building,
    event.location.room || '',
    ...event.tags
  ];
  
  return terms
    .filter(term => term) // Remove empty strings
    .join(' ')
    .toLowerCase();
}

/**
 * Generate GSI3PK for location-based queries
 * 
 * @param building - Building name
 * @returns GSI3PK value
 * 
 * @example
 * generateLocationPK("Iribe Center")
 * // Returns: "EVENT#LOCATION#Iribe Center"
 */
export function generateLocationPK(building: string): string {
  return `EVENT#LOCATION#${building}`;
}

/**
 * Generate GSI3SK for location-based queries
 * 
 * @param room - Room number (optional)
 * @param eventId - Event ID
 * @returns GSI3SK value
 * 
 * @example
 * generateLocationSK("1200", "evt-123")
 * // Returns: "ROOM#1200#evt-123"
 * 
 * generateLocationSK(undefined, "evt-123")
 * // Returns: "ROOM#NONE#evt-123"
 */
export function generateLocationSK(room: string | undefined, eventId: string): string {
  const roomKey = room || 'NONE';
  return `ROOM#${roomKey}#${eventId}`;
}

/**
 * Calculate available seats for an event
 * 
 * @param capacity - Total event capacity
 * @param registeredCount - Number of registered attendees
 * @returns Available seats (never negative)
 */
export function calculateAvailableSeats(
  capacity: number, 
  registeredCount: number
): number {
  return Math.max(0, capacity - registeredCount);
}

/**
 * Check if waitlist is available
 * Waitlist is available when event is full but hasn't reached max waitlist size
 * 
 * @param capacity - Total event capacity
 * @param registeredCount - Number of registered attendees
 * @param waitlistCount - Current waitlist size
 * @param maxWaitlistSize - Maximum waitlist size (default: 50)
 * @returns True if waitlist is available
 */
export function isWaitlistAvailable(
  capacity: number,
  registeredCount: number,
  waitlistCount: number,
  maxWaitlistSize: number = 50
): boolean {
  const isFull = registeredCount >= capacity;
  const hasWaitlistSpace = waitlistCount < maxWaitlistSize;
  return isFull && hasWaitlistSpace;
}

/**
 * Normalize search query for better matching
 * 
 * @param query - User's search query
 * @returns Normalized query
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalize multiple spaces
}

/**
 * Calculate search relevance score
 * Higher score = more relevant result
 * 
 * @param searchQuery - User's search query
 * @param searchTerms - Event's search terms
 * @param title - Event title (weighted higher)
 * @returns Relevance score (0-100)
 */
export function calculateRelevanceScore(
  searchQuery: string,
  searchTerms: string,
  title: string
): number {
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const queryWords = normalizedQuery.split(' ');
  
  let score = 0;
  
  // Title matches are worth more
  const titleLower = title.toLowerCase();
  queryWords.forEach(word => {
    if (titleLower.includes(word)) {
      score += 10; // Title match: 10 points per word
    }
  });
  
  // Search terms matches
  const termsLower = searchTerms.toLowerCase();
  queryWords.forEach(word => {
    if (termsLower.includes(word)) {
      score += 5; // Terms match: 5 points per word
    }
  });
  
  // Exact phrase match bonus
  if (termsLower.includes(normalizedQuery)) {
    score += 20;
  }
  
  // Title exact match super bonus
  if (titleLower.includes(normalizedQuery)) {
    score += 30;
  }
  
  return Math.min(100, score); // Cap at 100
}
