/**
 * GamifyBadge Component
 * Displays a badge with rarity styling
 */

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked_at?: string;
}

interface GamifyBadgeProps {
  badge: Badge;
}

export default function GamifyBadge({ badge }: GamifyBadgeProps) {
  const rarityColors = {
    common: 'border-green-500 text-green-500',
    uncommon: 'border-blue-500 text-blue-500',
    rare: 'border-purple-500 text-purple-500',
    epic: 'border-yellow-500 text-yellow-500',
    legendary: 'border-red-500 text-red-500',
  };

  const borderColor = rarityColors[badge.rarity as keyof typeof rarityColors] || rarityColors.common;

  return (
    <div className={`border ${borderColor} p-4 text-center hover:scale-105 transition-transform`}>
      <div className="text-4xl mb-2">{badge.icon}</div>
      <div className="font-bold text-sm">{badge.name}</div>
      <div className="text-xs text-green-400 mt-1">{badge.description}</div>
      {badge.unlocked_at && (
        <div className="text-xs text-green-600 mt-2">
          {new Date(badge.unlocked_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
