export const generateWhatsAppLink = (text: string) => {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

export const shareResult = (score: number, maxScore: number, terasScores: Record<string, { percentage: number }>) => {
    const percentage = Math.round((score / maxScore) * 100);
    const text = `Saya baru sahaja menamatkan Ujian Psikometrik Simulasi dengan skor ${percentage}% ! 🚀\n\nAnalisis Teras: \n${Object.keys(terasScores).map(k => `- ${k}: ${terasScores[k].percentage}%`).join('\n')} \n\nCuba sekarang di: http://localhost:3000`; // Update URL in production

    window.open(generateWhatsAppLink(text), '_blank');
};

export const shareApp = () => {
    const text = `Jom cuba Simulasi Ujian Psikometrik Online! Latih tubi soalan sebenar dan dapatkan analisis prestasi. \n\nCuba sekarang: http://localhost:3000`;
    window.open(generateWhatsAppLink(text), '_blank');
};
