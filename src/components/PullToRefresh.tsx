import React, { useCallback, useState } from "react";
import { ScrollView, RefreshControl, ScrollViewProps } from "react-native";
import colors from "../theme/colors";

interface PullToRefreshProps extends ScrollViewProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export function PullToRefresh({
  onRefresh,
  children,
  refreshControl,
  ...scrollProps
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      refreshControl={
        refreshControl ?? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        )
      }
      {...scrollProps}
    >
      {children}
    </ScrollView>
  );
}

export default PullToRefresh;
