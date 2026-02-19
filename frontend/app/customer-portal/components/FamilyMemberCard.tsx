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
    const numericSeed = Math.abs(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 100;
    
    // Use realistic photos for everyone (adults and children)
    const style = gender.toLowerCase() === 'male' ? 'men' : 'women';
    return `https://randomuser.me/api/portraits/${style}/${numericSeed}.jpg`;
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 shadow-lg hover:shadow-xl transition-all relative overflow-hidden">
      {/* Decorative wave pattern at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="fill-current text-blue-500"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" className="fill-current text-blue-400"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" className="fill-current text-blue-300"></path>
        </svg>
      </div>

      <div className="flex flex-col items-center text-center relative z-10">
        {/* Avatar with thin black ring */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden border border-black bg-gray-100 shadow-lg">
            <img 
              src={getAvatarUrl(member.name, member.gender, member.age)} 
              alt={member.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name */}
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{member.name}</h3>
        
        {/* Role */}
        <p className="text-lg text-blue-600 font-semibold mb-4">{getRoleLabel(member.role)}</p>
        
        {/* Age and Gender */}
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{member.age} years</span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-1">
            {member.gender.toLowerCase() === 'male' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
              </svg>
            )}
            <span className="text-sm font-medium">{member.gender}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyMemberCard;
