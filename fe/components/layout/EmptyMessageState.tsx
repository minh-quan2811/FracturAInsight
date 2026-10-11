interface EmptyMessageStateProps {
  userRole?: string;
}

export function EmptyMessageState({ userRole }: EmptyMessageStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="eyebrow">New conversation</p>
      <h3 className="heading mt-3 text-xl">Start a conversation</h3>
      <p className="t-secondary mx-auto mt-2 max-w-md text-[15px] leading-relaxed">
        {userRole === "teacher"
          ? "Ask me about bone fractures, treatments, or help students with their questions."
          : "Ask me about bone fractures, treatments, symptoms, or any related medical questions."}
      </p>
    </div>
  );
}