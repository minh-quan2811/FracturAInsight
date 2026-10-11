import { Button } from "../ui/Button";

interface EmptyChatStateProps {
  onNewChat: () => void;
}

export function EmptyChatState({ onNewChat }: EmptyChatStateProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-glow" aria-hidden="true" />
      <div className="relative w-full max-w-lg text-center">
        <p className="eyebrow eyebrow-accent">Get started</p>
        <h2 className="display mt-4 text-4xl">Welcome to Bone Vision Assistant.</h2>
        <p className="t-secondary mx-auto mt-5 max-w-md text-base leading-relaxed">
          Select a conversation from the sidebar or start a new chat. Get instant help
          with bone fracture questions and medical guidance.
        </p>
        <Button onClick={onNewChat} size="lg" className="mt-8">
          Start new conversation
        </Button>
      </div>
    </div>
  );
}