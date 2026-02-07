export function SurveySealLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer scalloped edge of wax seal */}
      <path
        d="M50 2
          C53 8, 58 6, 62 3
          C64 10, 70 10, 76 8
          C76 15, 81 18, 88 17
          C85 24, 89 28, 95 30
          C90 35, 92 41, 97 45
          C92 50, 92 55, 97 60
          C91 64, 89 69, 93 75
          C87 77, 84 80, 85 87
          C80 86, 75 88, 73 93
          C68 90, 64 92, 60 97
          C56 93, 53 93, 50 98
          C47 93, 44 93, 40 97
          C36 92, 32 90, 27 93
          C25 88, 20 86, 15 87
          C16 80, 13 77, 7 75
          C11 69, 9 64, 3 60
          C8 55, 8 50, 3 45
          C8 41, 10 35, 5 30
          C11 28, 15 24, 12 17
          C19 18, 24 15, 24 8
          C30 10, 36 10, 38 3
          C42 6, 47 8, 50 2Z"
        fill="currentColor"
        className="text-primary"
      />
      {/* Inner ring */}
      <circle
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary-foreground"
        opacity="0.3"
      />
      {/* Stylized S letter */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        className="text-primary-foreground"
        fontSize="44"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
        dy="2"
      >
        S
      </text>
    </svg>
  );
}
