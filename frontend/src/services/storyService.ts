import { apiClient } from '@/integrations/api/client';

const STORIES_ENDPOINT = 'stories/';
const STORY_COMMENTS_ENDPOINT = 'story-comments/';

export interface StoryLink {
  id?: number;
  linked_type: string;
  linked_id: string;
}

export interface Story {
  id: number | string;
  author: number;
  author_name?: string;
  title: string;
  content: string;
  cover_image?: string;
  tourist_point?: number | null;
  tags?: string[];
  media_images?: string[];
  media_videos?: string[];
  location_name?: string;
  location_lat?: number | string | null;
  location_lon?: number | string | null;
  trip_date?: string | null;
  story_type?: string;
  ai_generated_from?: string | null;
  is_public: boolean;
  is_featured?: boolean;
  is_verified?: boolean;
  likes_count: number;
  views_count: number;
  comments_count: number;
  shares_count?: number;
  published_at?: string | null;
  media?: any[];
  comments?: StoryComment[];
  travel_story_links?: StoryLink[];
  activity_categories?: string[];
  intensity_level?: string;
  partner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StoryComment {
  id: number | string;
  story: number | string;
  author: number;
  author_name?: string;
  content: string;
  sentiment?: string;
  created_at: string;
}

export interface FetchStoriesParams {
  search?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  linked_type?: string;
  story_type?: string;
  sort?: 'newest' | 'popular' | 'most_liked' | 'most_commented';
  mine?: boolean;
  has_location?: boolean;
  limit?: number;
}

export interface CreateStoryPayload {
  title: string;
  content: string;
  tags?: string[];
  location_name?: string | null;
  location_lat?: number | null;
  location_lon?: number | null;
  trip_date?: string | null;
  is_public?: boolean;
  story_type?: string;
  ai_generated_from?: string | null;
  media_images?: string[];
  media_videos?: string[];
  linked_entities?: StoryLink[];
}

export type UpdateStoryPayload = Partial<CreateStoryPayload> & {
  is_public?: boolean;
  is_verified?: boolean;
  is_featured?: boolean;
};

const buildQueryParams = (params: FetchStoriesParams = {}) => {
  const searchParams: Record<string, string | number | boolean | undefined> = {};
  if (params.search) searchParams.search = params.search;
  if (params.location) searchParams.location = params.location;
  if (params.date_from) searchParams.date_from = params.date_from;
  if (params.date_to) searchParams.date_to = params.date_to;
  if (params.tags && params.tags.length > 0) searchParams.tags = params.tags.join(',');
  if (params.linked_type) searchParams.linked_type = params.linked_type;
  if (params.story_type) searchParams.story_type = params.story_type;
  if (params.sort) searchParams.sort = params.sort;
  if (params.mine) searchParams.mine = true;
  if (params.has_location) searchParams.has_location = true;
  if (params.limit) searchParams.limit = params.limit;
  return searchParams;
};

const toId = (id: string | number) => String(id);

export const storyService = {
  fetchStories(params: FetchStoriesParams = {}) {
    return apiClient.get<Story[]>(STORIES_ENDPOINT, buildQueryParams(params));
  },

  fetchTrendingStories(days: number) {
    return apiClient.get<Story[]>(`${STORIES_ENDPOINT}trending/`, { days });
  },

  fetchRecommendations() {
    return apiClient.get<Story[]>(`${STORIES_ENDPOINT}recommendations/`);
  },

  fetchStory(id: string | number) {
    return apiClient.get<Story>(`${STORIES_ENDPOINT}${toId(id)}/`);
  },

  createStory(payload: CreateStoryPayload) {
    return apiClient.post<Story>(STORIES_ENDPOINT, payload);
  },

  updateStory(id: string | number, payload: UpdateStoryPayload) {
    return apiClient.patch<Story>(`${STORIES_ENDPOINT}${toId(id)}/`, payload);
  },

  deleteStory(id: string | number) {
    return apiClient.delete(`${STORIES_ENDPOINT}${toId(id)}/`);
  },

  getLikeStatus(storyId: string | number) {
    return apiClient.get<{ liked: boolean; likes_count: number }>(`${STORIES_ENDPOINT}${toId(storyId)}/like/`);
  },

  toggleLike(storyId: string | number) {
    return apiClient.post<{ liked: boolean; likes_count: number }>(`${STORIES_ENDPOINT}${toId(storyId)}/like/`);
  },

  getBookmarkStatus(storyId: string | number) {
    return apiClient.get<{ bookmarked: boolean }>(`${STORIES_ENDPOINT}${toId(storyId)}/bookmark/`);
  },

  toggleBookmark(storyId: string | number) {
    return apiClient.post<{ bookmarked: boolean }>(`${STORIES_ENDPOINT}${toId(storyId)}/bookmark/`);
  },

  fetchComments(storyId: string | number) {
    return apiClient.get<StoryComment[]>(STORY_COMMENTS_ENDPOINT, { story: storyId });
  },

  addComment(storyId: string | number, content: string) {
    return apiClient.post<StoryComment>(STORY_COMMENTS_ENDPOINT, { story: Number(storyId), content });
  },

  fetchStats() {
    return apiClient.get<{
      stories_count: number;
      followers_count: number;
      following_count: number;
      countries_visited: number;
      total_likes: number;
    }>(`${STORIES_ENDPOINT}stats/`);
  },
};
