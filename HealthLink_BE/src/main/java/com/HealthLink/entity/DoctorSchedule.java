import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity
@Table(name = "DoctorSchedules")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DoctorSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ScheduleID")
    private Integer scheduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DoctorId", nullable = false)
    @ToString.Exclude
    private Doctor doctor;

    private Integer dayOfWeek; // 0=CN, 1=T2...
    
    @Column(nullable = false)
    private LocalTime startTime;
    
    @Column(nullable = false)
    private LocalTime endTime;

    private Integer slotDuration = 30;
    private Integer maxPatients = 1;
    private boolean isAvailable = true;

    @Column(length = 50)
    private String consultationType;
    private String location;
    
    @Column(length = 500)
    private String notes;
}