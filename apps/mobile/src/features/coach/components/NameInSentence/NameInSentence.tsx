/** "{name} סיימה את …" with her name in bold (her own name never passes through the template). */
export function NameInSentence({ sentence, name }: { sentence: string; name: string }) {
  const [before, ...rest] = sentence.split('{name}');
  if (rest.length === 0) return <>{sentence}</>;
  return (
    <>
      {before}
      <b>
        <bdi>{name}</bdi>
      </b>
      {rest.join(name)}
    </>
  );
}
