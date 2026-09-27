import { Redirect } from 'expo-router';

/** Keep the booking screens in source/data, but route users away while the feature is hidden. */
export default function HiddenBookingsLayout() {
  return <Redirect href="/(tabs)/forum" />;
}
