// The portal's deep-link return (audit fix P1-3): if the app was killed mid-connection, the
// redirect cold-starts here — force a sync so the new connection surfaces NOW (not up to 20h
// later), then land on the connect flow, which opens on the wrapper question when one is pending.
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { runSnapTradeSync } from '../src/services/sync/snaptradeSync';

export default function ConnectDone() {
  const router = useRouter();
  useEffect(() => {
    let live = true;
    runSnapTradeSync({ force: true }).catch(() => {}).finally(() => {
      if (live) router.replace('/connect' as any);
    });
    return () => { live = false; };
  }, []);
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
}
