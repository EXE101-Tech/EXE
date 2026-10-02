import { useVideoPlayer, VideoView } from 'expo-video';

interface PostVideoProps {
  uri: string;
  height?: number;
}

/** Native video player with system controls. Kept in its own file so it can be loaded lazily. */
export default function PostVideo({ uri, height = 260 }: PostVideoProps) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: '100%', height, backgroundColor: '#000' }}
    />
  );
}
