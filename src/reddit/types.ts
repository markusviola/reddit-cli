export type Listing<T> = {
  after: string | null;
  children: T[];
};

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
};

export type RedditComment = {
  kind: 'comment';
  id: string;
  author: string;
  body: string;
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
