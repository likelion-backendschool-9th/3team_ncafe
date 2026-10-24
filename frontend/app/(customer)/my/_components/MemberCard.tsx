import type { Member } from "@/app/_lib/auth/types";
import styles from "../mypage.module.css";

type Props = { user: Member };

export function MemberCard({ user }: Props) {
  return (
    <section
      className={styles.memberCard}
      aria-labelledby="member-card-title"
    >
      <div className={styles.memberCardTop}>
        <h2 id="member-card-title">삼다방 단골 회원증</h2>
        {/* <span>No. {user.id}</span> */}
      </div>
      <dl className={styles.memberFields}>
        <div>
          <dt>닉네임</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt>이메일</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>
      <span className={styles.stamp} aria-hidden="true">
        단골
        <small>SAMDABANG</small>
      </span>
    </section>
  );
}
