import Header3D from './components/Header3D';
import Footer3D from './components/Footer3D';
import Landing3DPage from './components/Landing3DPage';

export default function Landing3D() {
  return (
    <div className="bg-[#0c0c0c] min-h-screen text-white selection:bg-white selection:text-black font-sans">
      <Header3D />
      <Landing3DPage />
      <Footer3D />
    </div>
  );
}
