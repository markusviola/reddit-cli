export type Listing<T> = {
  after: string | null;
  children: T[];
};

/** One fetchable image (decoded URL, stable id, pixel size). */
export type ImageRef = {
  id: string;
  url: string;
  width: number;
  height: number;
};

/** A single openable image or an ordered gallery carousel. */
export type ImageAttachment = {
  id: string;
  images: ImageRef[];
};

/** A post/comment body split into text and inline-image pieces. */
export type BodySegment = { kind: 'text'; text: string } | { kind: 'image'; attachment: ImageAttachment };

export type RedditPost = {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;
  selftext: string;
  url: string;
  hasImage: boolean;
  primaryAttachment: ImageAttachment | null;
  bodySegments: BodySegment[];
};

export type RedditComment = {
  kind: 'comment';
  id: string;
  author: string;
  body: string;
  bodySegments?: BodySegment[];
  score: number;
  createdUtc: number;
  replies: RedditThing[];
};

export type MoreComments = {
  kind: 'more';
  id: string;
  childIds: string[];
  count: number;
};

export type RedditThing = RedditComment | MoreComments;

export type RedditSubreddit = {
  name: string;
  title: string;
  subscribers: number;
  publicDescription: string;
};
