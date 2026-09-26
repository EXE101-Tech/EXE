import { router } from 'expo-router';
import { Crown, Plus, Trophy, UserCheck, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { CreateTeamModal } from '@/components/teams/create-team-modal';
import { ReviewTeamModal } from '@/components/teams/review-team-modal';
import { TeamCard } from '@/components/teams/team-card';
import { TeamMembersModal } from '@/components/teams/team-members-modal';
import { FilterGrid } from '@/components/ui/filter-grid';
import type { SelectOption } from '@/components/ui/select-dropdown';
import { useStartConversationMutation } from '@/hooks/queries/use-chat';
import { useJoinTeamMutation, useLeaveTeamMutation, useTeamsQuery } from '@/hooks/queries/use-teams';
import { SPORTS } from '@/lib/constants';
import type { TeamResponse } from '@/schemas/teams';

const SPORT_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả môn' },
  ...SPORTS.map((sport) => ({ value: sport.key, label: sport.name, emoji: sport.emoji })),
];

type Scope = 'captain' | 'member' | 'discover';

const SCOPE_TABS: { value: Scope; label: string; icon: typeof Crown }[] = [
  { value: 'captain', label: 'CLB tôi làm chủ', icon: Crown },
  { value: 'member', label: 'CLB tôi tham gia', icon: UserCheck },
  { value: 'discover', label: 'Khám phá CLB', icon: Users },
];

export default function TeamsScreen() {
  const { data: teams, isLoading, isError, refetch, isRefetching } = useTeamsQuery();
  const joinTeam = useJoinTeamMutation();
  const leaveTeam = useLeaveTeamMutation();
  const startConversation = useStartConversationMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamResponse | null>(null);
  const [reviewingTeamId, setReviewingTeamId] = useState<number | null>(null);
  const [managingTeam, setManagingTeam] = useState<TeamResponse | null>(null);

  const [sportFilter, setSportFilter] = useState('all');
  const [scope, setScope] = useState<Scope>('captain');

  const filteredTeams = useMemo(() => {
    return (teams ?? []).filter((team) => {
      if (sportFilter !== 'all' && team.sport_id !== sportFilter) return false;
      if (scope === 'captain') return team.is_captain;
      if (scope === 'member') return team.is_member;
      return !team.is_captain && !team.is_member;
    });
  }, [teams, sportFilter, scope]);

  const handleChat = async (ownerId: number | null | undefined) => {
    if (!ownerId) return;
    try {
      const conversation = await startConversation.mutateAsync(ownerId);
      router.push({ pathname: '/chat/[id]', params: { id: String(conversation.id) } });
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không mở được cuộc trò chuyện');
    }
  };

  return (
    <ScreenContainer scroll={false} className="px-4">
      <TopNavbar />

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-black text-slate-900 dark:text-white">Đội / Club</Text>
        <TouchableOpacity
          onPress={() => setIsCreateOpen(true)}
          className="h-9 w-9 items-center justify-center rounded-full bg-brand dark:bg-brand-dark"
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <FilterGrid
        items={[
          { icon: Trophy, iconColor: '#F59E0B', value: sportFilter, options: SPORT_OPTIONS, onChange: setSportFilter },
          ...SCOPE_TABS.map((tab) => ({
            kind: 'toggle' as const,
            icon: tab.icon,
            iconColor: '#8B5CF6',
            label: tab.label,
            active: scope === tab.value,
            onPress: () => setScope(tab.value),
          })),
        ]}
      />

      {isLoading ? (
        <LoadingState label="Đang tải danh sách CLB…" />
      ) : isError ? (
        <EmptyState icon={Users} title="Không tải được danh sách CLB" description="Kéo để tải lại." />
      ) : (
        <FlatList
          className="flex-1"
          data={filteredTeams}
          keyExtractor={(item) => String(item.id)}
          contentContainerClassName="gap-3 pb-8"
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <TeamCard
              team={item}
              isJoining={joinTeam.isPending && joinTeam.variables === item.id}
              isLeaving={leaveTeam.isPending && leaveTeam.variables === item.id}
              onJoin={() => joinTeam.mutate(item.id, { onError: (e) => Alert.alert('Lỗi', e.message) })}
              onLeave={() => leaveTeam.mutate(item.id, { onError: (e) => Alert.alert('Lỗi', e.message) })}
              onManage={() => setManagingTeam(item)}
              onEdit={() => setEditingTeam(item)}
              onReview={() => setReviewingTeamId(item.id)}
              onChat={() => handleChat(item.owner_id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={scope === 'captain' ? Crown : scope === 'member' ? UserCheck : Users}
              title={
                scope === 'captain'
                  ? 'Bạn chưa sở hữu CLB nào'
                  : scope === 'member'
                    ? 'Bạn chưa tham gia CLB nào'
                    : 'Không tìm thấy CLB nào'
              }
              description={
                scope === 'captain'
                  ? 'Hãy thành lập CLB mới để bắt đầu xây dựng cộng đồng của bạn.'
                  : scope === 'member'
                    ? 'Hãy khám phá và tham gia các CLB ở tab "Khám phá CLB".'
                    : 'Thử đổi bộ lọc môn thể thao hoặc thành lập CLB mới.'
              }
            />
          }
        />
      )}

      <CreateTeamModal visible={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      {editingTeam ? (
        <CreateTeamModal visible team={editingTeam} onClose={() => setEditingTeam(null)} />
      ) : null}
      {managingTeam ? (
        <TeamMembersModal
          visible
          teamId={managingTeam.id}
          canManage={managingTeam.is_captain}
          onClose={() => setManagingTeam(null)}
        />
      ) : null}
      {reviewingTeamId != null ? (
        <ReviewTeamModal visible teamId={reviewingTeamId} onClose={() => setReviewingTeamId(null)} />
      ) : null}
    </ScreenContainer>
  );
}
