import jakarta.persistence.*;
import lombok.*;
import java.util.Set;

@Entity
@Table(name = "Roles")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Role {
    @Id
    @Column(name = "Id", length = 450)
    private String id;

    @Column(name = "Name", length = 256, nullable = false)
    private String name;

    @ManyToMany(mappedBy = "roles")
    private Set<User> users;
}