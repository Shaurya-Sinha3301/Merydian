'use client';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  age: number;
  gender: string;
  passport_number: string;
}

interface FamilyMemberCardProps {
  member: FamilyMember;
}

const FamilyMemberCard = ({ member }: FamilyMemberCardProps) => {
  const getRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'Head': 'Family Head',
      'Member': 'Member',
      'Child': 'Child'
    };
    return roleMap[role] || role;
  };

  // Generate realistic avatar based on gender and age
  const getAvatarUrl = (name: string, gender: string, age: number) => {
    // Use a seed based on name for consistency
    const seed = name.toLowerCase().replace(/\s+/g, '-');
    
    // Determine avatar style based on age and gender
    if (age < 18) {
      // Children - use fun, friendly avatars
      return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    } else {
      // Adults - use more realistic avatars
      const style = gender.toLowerCase() === 'male' ? 'male' : 'female';
      return `https://randomuser.me/api/portraits/${style === 'male' ? 'men' : 'women'}/${Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 100}.jpg`;
    }
  };

  return (
    <div className="bg-[#FDFDFF] rounded-2xl p-6 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.9)] hover:shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.95)] transition-all">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden shadow-[4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.7)] mb-4 bg-gray-200">
          <img 
            src={getAvatarUrl(member.name, member.gender, member.age)} 
            alt={member.name}
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="text-lg font-bold text-[#212121] mb-1">{member.name}</h3>
        <p className="text-sm text-[#212121]/60 mb-1">{getRoleLabel(member.role)}</p>
        <p className="text-xs text-[#212121]/40">{member.age} years • {member.gender}</p>
      </div>
    </div>
  );
};

export default FamilyMemberCard;
