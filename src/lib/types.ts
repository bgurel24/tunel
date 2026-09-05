// Paylaşılan tipler.

export type FeedKind = 'takim' | 'sosyal';

export type PostMusic = {
  title: string;
  artist: string;
};

export type Post = {
  id: string;
  authorId: string;
  username: string;
  avatarUrl?: string | null;
  gym?: string | null;
  /** Antrenman etiketi — "Bacak", "Göğüs", "Kardiyo" gibi. */
  workoutTag?: string | null;
  /** Dolu ise bu paylaşım bir görev kanıtı — kartta görev adı rozeti çıkar. */
  taskTitle?: string | null;
  isLive: boolean;
  // null => görsel yok, barbell placeholder gösterilir (demo/ağsız durum)
  imageUrl?: string | null;
  // dolu ise post bir video (görev kanıtı paylaşımı) — feed'de oynatıcı gösterilir
  videoUrl?: string | null;
  caption?: string | null;
  likeCount: number;
  commentCount: number;
  clapCount: number;
  myLiked: boolean;
  myClapped: boolean;
  streakWeeks?: number | null;
  music?: PostMusic | null;
  timeLabel: string;
};
